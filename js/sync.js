import { supabase } from './auth.js';

let currentRoomId = null;
let syncChannel = null;
let actionChannel = null;
let onStateUpdate = null;
let isHost = false;
let isSyncing = false;

// Инициализация синхронизации
export function initSync(roomId, userId, host, onUpdate) {
    currentRoomId = roomId;
    isHost = host;
    onStateUpdate = onUpdate;
    isSyncing = true;
    
    console.log(`🔄 Инициализация синхронизации для комнаты ${roomId}, хост: ${host}`);
    
    // Подписываемся на изменения состояния игры
    if (syncChannel) supabase.removeChannel(syncChannel);
    syncChannel = supabase
        .channel(`game_state:${roomId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_state',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            console.log('📢 Обновление состояния игры:', payload);
            if (onStateUpdate) onStateUpdate(payload.new);
        })
        .subscribe((status) => {
            console.log('📡 Статус синхронизации игры:', status);
        });
    
    // Подписываемся на действия игроков
    if (actionChannel) supabase.removeChannel(actionChannel);
    actionChannel = supabase
        .channel(`game_actions:${roomId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_actions',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            const action = payload.new;
            console.log('📢 Действие игрока:', action);
            if (window.game && window.game.handleAction) {
                window.game.handleAction(action);
            }
        })
        .subscribe((status) => {
            console.log('📡 Статус подписки на действия:', status);
        });
    
    // Если хост, создаём начальное состояние
    if (isHost) {
        createInitialState(roomId);
    }
}

// Создать начальное состояние игры (только хост)
async function createInitialState(roomId) {
    console.log('👑 Хост создаёт начальное состояние...');
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('players, map')
        .eq('id', roomId)
        .single();
    if (roomError) throw roomError;
    
    const players = room.players || [];
    const playersState = {};
    players.forEach(id => {
        playersState[id] = { gold: 80, lives: 20, score: 0 };
    });
    
    const state = {
        room_id: roomId,
        map: room.map || 'default',
        wave: 1,
        wave_index: 0,
        enemies: [],
        towers: [],
        players_state: playersState,
        game_over: false,
        victory: false
    };
    
    const { error } = await supabase
        .from('game_state')
        .upsert(state, { onConflict: 'room_id' });
    if (error) throw error;
    console.log('✅ Начальное состояние создано');
}

// Отписаться от синхронизации
export function unsubscribeSync() {
    console.log('🔄 Отписка от синхронизации');
    if (syncChannel) supabase.removeChannel(syncChannel);
    if (actionChannel) supabase.removeChannel(actionChannel);
    syncChannel = null;
    actionChannel = null;
    isSyncing = false;
}

// Отправить действие игрока
export async function sendAction(actionType, data) {
    if (!currentRoomId || !isSyncing) return;
    const user = getCurrentUser();
    const playerId = user ? user.id : null;
    if (!playerId) return;
    
    const action = {
        room_id: currentRoomId,
        player_id: playerId,
        action_type: actionType,
        data: data
    };
    console.log(`📤 Отправка действия: ${actionType}`, data);
    const { error } = await supabase
        .from('game_actions')
        .insert(action);
    if (error) console.error('Ошибка отправки действия:', error);
}

// Обновить состояние игры (только хост)
export async function updateGameState(newState) {
    if (!isHost || !currentRoomId || !isSyncing) return;
    console.log('👑 Хост обновляет состояние:', newState);
    const { error } = await supabase
        .from('game_state')
        .update(newState)
        .eq('room_id', currentRoomId);
    if (error) console.error('Ошибка обновления состояния:', error);
}

// Получить текущее состояние игры
export async function getGameState(roomId) {
    const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .eq('room_id', roomId)
        .single();
    if (error) throw error;
    return data;
}

// Получить текущего пользователя (локально из localStorage)
function getCurrentUser() {
    const data = localStorage.getItem('user');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}
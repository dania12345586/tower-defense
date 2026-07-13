import { supabase } from './auth.js';

let currentRoomId = null;
let currentChannel = null;
let roomCallbacks = {};

// --- Подписка на изменения в комнате ---
export function subscribeToRoom(roomId, onUpdate) {
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
    }
    currentChannel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
        }, (payload) => {
            if (onUpdate) onUpdate(payload.new);
        })
        .subscribe((status) => {
            console.log('Подписка на комнату:', status);
        });
    return currentChannel;
}

// --- Отписаться ---
export function unsubscribeFromRoom() {
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
    }
}

// --- Создать комнату ---
export async function createRoom(hostId, map = 'default') {
    const { data, error } = await supabase
        .from('rooms')
        .insert({
            host_id: hostId,
            map: map,
            players: [hostId]
        })
        .select()
        .single();
    if (error) throw error;
    currentRoomId = data.id;
    return data;
}

// --- Получить список комнат ---
export async function getWaitingRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// --- Присоединиться к комнате ---
export async function joinRoom(roomId, userId) {
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, status')
        .eq('id', roomId)
        .single();
    if (fetchError) throw fetchError;
    if (room.status !== 'waiting') throw new Error('Комната уже запущена');
    const players = room.players || [];
    if (players.includes(userId)) throw new Error('Вы уже в комнате');
    players.push(userId);
    const { data, error } = await supabase
        .from('rooms')
        .update({ players })
        .eq('id', roomId)
        .select()
        .single();
    if (error) throw error;
    currentRoomId = roomId;
    return data;
}

// --- Кикнуть игрока (только хост) ---
export async function kickPlayer(roomId, userId, hostId) {
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, host_id')
        .eq('id', roomId)
        .single();
    if (fetchError) throw fetchError;
    if (room.host_id !== hostId) throw new Error('Только хост может кикать');
    const players = (room.players || []).filter(id => id !== userId);
    const { data, error } = await supabase
        .from('rooms')
        .update({ players })
        .eq('id', roomId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// --- Покинуть комнату (с передачей хоста) ---
export async function leaveRoom(roomId, userId) {
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, host_id')
        .eq('id', roomId)
        .single();
    if (fetchError) throw fetchError;
    
    let players = (room.players || []).filter(id => id !== userId);
    let newHostId = room.host_id;
    
    // Если хост уходит – передаём хоста первому в списке
    if (room.host_id === userId && players.length > 0) {
        newHostId = players[0];
    }
    
    // Если игроков больше нет – удаляем комнату
    if (players.length === 0) {
        await supabase.from('rooms').delete().eq('id', roomId);
        return { deleted: true };
    }
    
    const { data, error } = await supabase
        .from('rooms')
        .update({ players, host_id: newHostId })
        .eq('id', roomId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// --- Голосование за карту (с удалением старого голоса) ---
export async function voteMap(roomId, playerId, map) {
    // Сначала удаляем старый голос
    const { error: delError } = await supabase
        .from('room_votes')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId);
    if (delError) throw delError;
    
    // Вставляем новый
    const { error } = await supabase
        .from('room_votes')
        .insert({ room_id: roomId, player_id: playerId, map });
    if (error) throw error;
    return true;
}

// --- Получить текущие голоса ---
export async function getVotes(roomId) {
    const { data, error } = await supabase
        .from('room_votes')
        .select('*')
        .eq('room_id', roomId);
    if (error) throw error;
    return data;
}

// --- Подписка на голоса ---
export function subscribeToVotes(roomId, onVoteUpdate) {
    const channel = supabase
        .channel(`votes:${roomId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'room_votes',
            filter: `room_id=eq.${roomId}`
        }, () => {
            if (onVoteUpdate) onVoteUpdate();
        })
        .subscribe();
    return channel;
}

// --- Получить имена игроков по их ID ---
export async function getPlayerNames(playerIds) {
    if (!playerIds || playerIds.length === 0) return {};
    const { data, error } = await supabase
        .from('players')
        .select('id, username')
        .in('id', playerIds);
    if (error) throw error;
    const names = {};
    data.forEach(p => { names[p.id] = p.username; });
    return names;
}

// --- Запустить игру (хост) ---
export async function startGame(roomId, hostId) {
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();
    if (fetchError) throw fetchError;
    if (room.host_id !== hostId) throw new Error('Только хост может начать игру');
    const { error } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);
    if (error) throw error;
    return true;
}
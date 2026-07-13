import { supabase } from './auth.js';

let currentChannel = null;

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
            console.log('📢 Обновление комнаты:', payload);
            if (onUpdate) onUpdate(payload.new);
        })
        .subscribe((status) => {
            console.log('📡 Статус подписки на комнату:', status);
        });
    return currentChannel;
}

export function unsubscribeFromRoom() {
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
    }
}

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
    return data;
}

export async function getWaitingRooms() {
    // Получаем все комнаты со статусом 'waiting'
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Удаляем пустые комнаты
    const toDelete = data.filter(room => !room.players || room.players.length === 0);
    for (const room of toDelete) {
        await supabase.from('rooms').delete().eq('id', room.id);
        console.log('Удалена пустая комната:', room.id);
    }
    
    // Возвращаем только комнаты с игроками
    return data.filter(room => room.players && room.players.length > 0);
}

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
    return data;
}

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

export async function leaveRoom(roomId, userId) {
    console.log('Выход из комнаты:', roomId, userId);
    const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('players, host_id')
        .eq('id', roomId)
        .single();
    if (fetchError) throw fetchError;
    
    let players = (room.players || []).filter(id => id !== userId);
    let newHostId = room.host_id;
    
    if (room.host_id === userId && players.length > 0) {
        newHostId = players[0];
    }
    
    if (players.length === 0) {
        console.log('Игроков нет, удаляем комнату');
        const { error } = await supabase.from('rooms').delete().eq('id', roomId);
        if (error) {
            console.error('Ошибка удаления:', error);
            throw error;
        }
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

export async function voteMap(roomId, playerId, map) {
    const { error: delError } = await supabase
        .from('room_votes')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId);
    if (delError) throw delError;
    
    const { error } = await supabase
        .from('room_votes')
        .insert({ room_id: roomId, player_id: playerId, map });
    if (error) throw error;
    return true;
}

export async function getVotes(roomId) {
    const { data, error } = await supabase
        .from('room_votes')
        .select('*')
        .eq('room_id', roomId);
    if (error) throw error;
    return data;
}

export function subscribeToVotes(roomId, onVoteUpdate) {
    const channel = supabase
        .channel(`votes:${roomId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'room_votes',
            filter: `room_id=eq.${roomId}`
        }, () => {
            console.log('📢 Обновление голосов');
            if (onVoteUpdate) onVoteUpdate();
        })
        .subscribe((status) => {
            console.log('📡 Статус подписки на голоса:', status);
        });
    return channel;
}

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

export async function updateRoomMap(roomId, map) {
    const { error } = await supabase
        .from('rooms')
        .update({ map })
        .eq('id', roomId);
    if (error) throw error;
    return true;
}

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
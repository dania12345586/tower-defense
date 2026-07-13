import { supabase } from './supabaseClient.js';
import { getCurrentUser } from './auth.js';

let currentRoomId = null;
let currentChannel = null;
let roomCallbacks = {};

export function subscribeToRoom(roomId, onUpdate) {
    if (currentChannel) {
        supabase.removeChannel(currentChannel);
        currentChannel = null;
    }
    currentChannel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
        }, (payload) => {
            if (onUpdate) onUpdate(payload.new);
        })
        .subscribe();
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
    currentRoomId = data.id;
    return data;
}

export async function getWaitingRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
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
    currentRoomId = roomId;
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
    const { data, error } = await supabase
        .from('rooms')
        .update({ players, host_id: newHostId })
        .eq('id', roomId)
        .select()
        .single();
    if (error) throw error;
    if (players.length === 0) {
        await supabase.from('rooms').delete().eq('id', roomId);
    }
    return data;
}

export async function voteMap(roomId, playerId, map) {
    await supabase.from('room_votes').delete().eq('room_id', roomId).eq('player_id', playerId);
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
            if (onVoteUpdate) onVoteUpdate();
        })
        .subscribe();
    return channel;
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
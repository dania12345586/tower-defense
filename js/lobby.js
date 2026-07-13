import { 
    createRoom, getWaitingRooms, joinRoom, kickPlayer, leaveRoom, 
    voteMap, getVotes, subscribeToVotes, startGame, subscribeToRoom, unsubscribeFromRoom
} from './multiplayer.js';
import { getCurrentUser } from './auth.js';
import { supabase } from './supabaseClient.js';

let currentRoomId = null;
let currentUserId = null;
let isHost = false;
let roomData = null;
let votesChannel = null;
let selectedTowers = ['pistol', 'flame', 'dj']; // временно

export async function renderRoomList() {
    const container = document.getElementById('roomListContainer');
    if (!container) return;
    try {
        const rooms = await getWaitingRooms();
        container.innerHTML = rooms.length === 0 ? '<p>Нет доступных комнат. Создайте свою!</p>' : '';
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;';
            const playerCount = (room.players || []).length;
            div.innerHTML = `
                <span>Комната #${room.id.slice(0,6)} (${playerCount} игроков) - карта: ${room.map}</span>
                <button class="btn join-room-btn" data-roomid="${room.id}" style="padding:4px 12px;">Присоединиться</button>
            `;
            container.appendChild(div);
        });
        document.querySelectorAll('.join-room-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const roomId = btn.dataset.roomid;
                await joinRoomHandler(roomId);
            });
        });
    } catch (e) {
        console.error('Ошибка загрузки комнат:', e);
        container.innerHTML = '<p style="color:red;">Ошибка загрузки комнат: ' + e.message + '</p>';
    }
}

async function joinRoomHandler(roomId) {
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Пользователь не авторизован');
        const room = await joinRoom(roomId, user.id);
        currentRoomId = roomId;
        currentUserId = user.id;
        isHost = (room.host_id === user.id);
        openLobby(room);
    } catch (e) {
        alert('Ошибка присоединения: ' + e.message);
    }
}

export async function createRoomHandler() {
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('Пользователь не авторизован');
        const map = 'default';
        const room = await createRoom(user.id, map);
        currentRoomId = room.id;
        currentUserId = user.id;
        isHost = true;
        openLobby(room);
    } catch (e) {
        alert('Ошибка создания комнаты: ' + e.message);
    }
}

async function openLobby(room) {
    document.getElementById('roomListModal').style.display = 'none';
    document.getElementById('lobbyModal').style.display = 'flex';
    roomData = room;
    renderLobby(room);
    subscribeToRoom(room.id, (updatedRoom) => {
        roomData = updatedRoom;
        renderLobby(updatedRoom);
    });
    if (votesChannel) supabase.removeChannel(votesChannel);
    votesChannel = subscribeToVotes(room.id, () => {
        renderLobby(roomData);
    });
}

function renderLobby(room) {
    const container = document.getElementById('lobbyContent');
    if (!container) return;
    const players = room.players || [];
    const hostId = room.host_id;
    const userId = currentUserId;
    const isHostUser = (userId === hostId);

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Лобби (${players.length} игроков)</h3>
            <span style="color:#888; font-size:0.9rem;">Хост: ${hostId.slice(0,6)}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
    `;
    players.forEach(id => {
        const isYou = (id === userId);
        const canKick = isHostUser && !isYou && players.length > 1;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <span>${isYou ? '🌟 ' : ''} ${id.slice(0,6)} ${isYou ? ' (Вы)' : ''} ${id === hostId ? '👑' : ''}</span>
                ${canKick ? `<button class="btn kick-btn" data-playerid="${id}" style="padding:2px 8px; background:#e74c3c;">✕</button>` : ''}
            </div>
        `;
    });
    html += `</div>`;

    html += `
        <div style="margin-bottom:16px;">
            <h4>Выберите башни (макс. 4)</h4>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                ${['pistol','flame','dj','electric','laser'].map(type => `
                    <label style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; cursor:pointer;">
                        <input type="checkbox" class="lobby-tower-checkbox" value="${type}" ${selectedTowers.includes(type) ? 'checked' : ''}>
                        ${type}
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    if (room.status === 'waiting') {
        html += `
            <div style="margin-bottom:16px;">
                <h4>Голосование за карту</h4>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    <button class="btn vote-map-btn" data-map="default">🏙️ Город</button>
                    <button class="btn vote-map-btn" data-map="forest">🌲 Лес</button>
                    <button class="btn vote-map-btn" data-map="lunar">🌙 Луна</button>
                    <button class="btn vote-map-btn" data-map="snow">❄️ Снег</button>
                    <button class="btn vote-map-btn" data-map="mushroom">🍄 Грибы</button>
                    <button class="btn vote-map-btn" data-map="volcano">🌋 Вулкан</button>
                </div>
                <div id="voteResults" style="margin-top:8px; font-size:0.9rem;"></div>
            </div>
        `;
    }

    if (isHostUser && room.status === 'waiting') {
        html += `
            <button id="startGameBtnLobby" class="btn big-btn" style="background:#2ecc71;">Начать игру</button>
        `;
    }
    html += `
        <button id="leaveRoomBtn" class="btn" style="background:#e74c3c; margin-top:8px;">Покинуть комнату</button>
    `;

    container.innerHTML = html;

    document.querySelectorAll('.lobby-tower-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = document.querySelectorAll('.lobby-tower-checkbox:checked');
            window._selectedTowers = Array.from(checked).map(c => c.value);
            selectedTowers = window._selectedTowers;
        });
    });

    document.querySelectorAll('.vote-map-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const map = btn.dataset.map;
            try {
                await voteMap(room.id, userId, map);
                updateVotesDisplay(room.id);
            } catch (e) {
                alert('Ошибка голосования: ' + e.message);
            }
        });
    });

    document.querySelectorAll('.kick-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const playerId = btn.dataset.playerid;
            if (!confirm('Кикнуть игрока?')) return;
            try {
                await kickPlayer(room.id, playerId, userId);
            } catch (e) {
                alert('Ошибка кика: ' + e.message);
            }
        });
    });

    const startBtn = document.getElementById('startGameBtnLobby');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                await startGame(room.id, userId);
            } catch (e) {
                alert('Ошибка старта: ' + e.message);
            }
        });
    }

    document.getElementById('leaveRoomBtn').addEventListener('click', async () => {
        try {
            await leaveRoom(room.id, userId);
            closeLobby();
            document.getElementById('roomListModal').style.display = 'flex';
            renderRoomList();
        } catch (e) {
            alert('Ошибка выхода: ' + e.message);
        }
    });

    updateVotesDisplay(room.id);
}

async function updateVotesDisplay(roomId) {
    const container = document.getElementById('voteResults');
    if (!container) return;
    try {
        const votes = await getVotes(roomId);
        const voteCounts = {};
        votes.forEach(v => { voteCounts[v.map] = (voteCounts[v.map] || 0) + 1; });
        const total = votes.length;
        let text = '';
        for (const [map, count] of Object.entries(voteCounts)) {
            text += `${map}: ${count} голос${count>1?'а':'ов'} (${Math.round(count/total*100)}%)  `;
        }
        container.textContent = text || 'Нет голосов';
    } catch (e) {
        console.error('Ошибка получения голосов:', e);
    }
}

function closeLobby() {
    document.getElementById('lobbyModal').style.display = 'none';
    unsubscribeFromRoom();
    if (votesChannel) supabase.removeChannel(votesChannel);
    currentRoomId = null;
}
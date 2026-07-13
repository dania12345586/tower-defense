import { 
    createRoom, getWaitingRooms, joinRoom, kickPlayer, leaveRoom, 
    voteMap, getVotes, subscribeToVotes, startGame, subscribeToRoom, unsubscribeFromRoom,
    getPlayerNames
} from './multiplayer.js';
import { supabase, getCurrentUser } from './auth.js';

// --- Глобальные переменные ---
let currentRoomId = null;
let currentUserId = null;
let isHost = false;
let roomData = null;
let votesChannel = null;
let roomChannel = null;
const MAX_TOWERS = 4;

// --- Рендер списка комнат ---
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
    }
}

// --- Присоединение к комнате ---
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

// --- Создание комнаты ---
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

// --- Открыть лобби ---
async function openLobby(room) {
    document.getElementById('roomListModal').style.display = 'none';
    document.getElementById('lobbyModal').style.display = 'flex';
    roomData = room;
    
    // Подписываемся на обновления комнаты
    if (roomChannel) supabase.removeChannel(roomChannel);
    roomChannel = subscribeToRoom(room.id, (updatedRoom) => {
        roomData = updatedRoom;
        renderLobby(updatedRoom);
    });
    
    // Подписываемся на голоса
    if (votesChannel) supabase.removeChannel(votesChannel);
    votesChannel = subscribeToVotes(room.id, () => {
        // Обновляем только результаты голосования
        updateVotesDisplay(room.id);
    });
    
    renderLobby(room);
}

// --- Рендер лобби ---
async function renderLobby(room) {
    const container = document.getElementById('lobbyContent');
    if (!container) return;
    
    const players = room.players || [];
    const hostId = room.host_id;
    const userId = currentUserId;
    const isHostUser = (userId === hostId);
    
    // Получаем имена игроков
    let playerNames = {};
    if (players.length > 0) {
        try {
            playerNames = await getPlayerNames(players);
        } catch (e) {
            console.warn('Не удалось получить имена:', e);
        }
    }

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Лобби (${players.length} игроков)</h3>
            <span style="color:#888; font-size:0.9rem;">Хост: ${playerNames[hostId] || hostId.slice(0,6)}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
    `;
    
    players.forEach(id => {
        const isYou = (id === userId);
        const name = playerNames[id] || id.slice(0,6);
        const canKick = isHostUser && !isYou && players.length > 1;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:rgba(255,255,255,0.05); border-radius:6px;">
                <span>${isYou ? '🌟 ' : ''} ${name} ${isYou ? ' (Вы)' : ''} ${id === hostId ? '👑' : ''}</span>
                ${canKick ? `<button class="btn kick-btn" data-playerid="${id}" style="padding:2px 8px; background:#e74c3c;">✕</button>` : ''}
            </div>
        `;
    });
    html += `</div>`;

    // Выбор башен
    const allTowerTypes = ['pistol', 'flame', 'dj', 'electric', 'laser'];
    const towerLabels = {
        pistol: '🔫 Пистолетчик',
        flame: '🔥 Огнемёт',
        dj: '🎧 DJ',
        electric: '⚡ Электрошокер',
        laser: '🔴 Лазер'
    };
    let selectedTowers = window._selectedTowers || ['pistol', 'flame', 'dj'];
    
    html += `
        <div style="margin-bottom:16px;">
            <h4>Выберите башни (макс. ${MAX_TOWERS})</h4>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                ${allTowerTypes.map(type => `
                    <label style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; cursor:pointer;">
                        <input type="checkbox" class="lobby-tower-checkbox" value="${type}" ${selectedTowers.includes(type) ? 'checked' : ''}>
                        ${towerLabels[type]}
                    </label>
                `).join('')}
            </div>
            <div id="lobbyTowerWarning" style="color:#ff6b6b; font-size:0.8rem; margin-top:4px;"></div>
        </div>
    `;

    // Голосование за карту
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

    // Кнопки управления
    if (isHostUser && room.status === 'waiting') {
        html += `
            <button id="startGameBtnLobby" class="btn big-btn" style="background:#2ecc71;">Начать игру</button>
        `;
    }
    html += `
        <button id="leaveRoomBtn" class="btn" style="background:#e74c3c; margin-top:8px;">Покинуть комнату</button>
    `;

    container.innerHTML = html;

    // --- Привязка обработчиков ---
    
    // Выбор башен
    document.querySelectorAll('.lobby-tower-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const checked = document.querySelectorAll('.lobby-tower-checkbox:checked');
            if (checked.length > MAX_TOWERS) {
                this.checked = false;
                document.getElementById('lobbyTowerWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
                return;
            }
            document.getElementById('lobbyTowerWarning').textContent = '';
            const selected = Array.from(document.querySelectorAll('.lobby-tower-checkbox:checked')).map(c => c.value);
            window._selectedTowers = selected;
        });
    });

    // Голосование
    document.querySelectorAll('.vote-map-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const map = btn.dataset.map;
            try {
                await voteMap(room.id, userId, map);
                // Обновим голоса после отправки
                updateVotesDisplay(room.id);
            } catch (e) {
                alert('Ошибка голосования: ' + e.message);
            }
        });
    });

    // Кик
    document.querySelectorAll('.kick-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const playerId = btn.dataset.playerid;
            if (!confirm('Кикнуть игрока?')) return;
            try {
                await kickPlayer(room.id, playerId, userId);
                // Обновление придёт через Realtime
            } catch (e) {
                alert('Ошибка кика: ' + e.message);
            }
        });
    });

    // Начать игру
    const startBtn = document.getElementById('startGameBtnLobby');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                await startGame(room.id, userId);
                // После успешного старта закроем лобби и откроем игру
                // Пока просто сообщим
                alert('Игра начинается! (синхронизация пока не реализована)');
                closeLobby();
                document.getElementById('gameContainer').style.display = 'flex';
                // Запускаем игру локально (каждый игрок запускает свою копию)
                window._isMultiplayer = true;
                if (window.game) {
                    window.game.selectedMap = room.map || 'default';
                    window.game.startGame();
                }
            } catch (e) {
                alert('Ошибка старта: ' + e.message);
            }
        });
    }

    // Покинуть
    document.getElementById('leaveRoomBtn').addEventListener('click', async () => {
        try {
            const result = await leaveRoom(room.id, userId);
            closeLobby();
            if (result && result.deleted) {
                // Комната удалена, возвращаемся к списку
                document.getElementById('roomListModal').style.display = 'flex';
                renderRoomList();
            } else {
                // Просто вышли из комнаты
                document.getElementById('roomListModal').style.display = 'flex';
                renderRoomList();
            }
        } catch (e) {
            alert('Ошибка выхода: ' + e.message);
        }
    });

    // Обновляем голоса
    await updateVotesDisplay(room.id);
}

// --- Обновить отображение голосов ---
async function updateVotesDisplay(roomId) {
    const container = document.getElementById('voteResults');
    if (!container) return;
    try {
        const votes = await getVotes(roomId);
        const voteCounts = {};
        votes.forEach(v => { voteCounts[v.map] = (voteCounts[v.map] || 0) + 1; });
        const total = votes.length;
        let text = '';
        if (total === 0) {
            text = 'Нет голосов';
        } else {
            for (const [map, count] of Object.entries(voteCounts)) {
                text += `${map}: ${count} голос${count>1?'ов':'а'} (${Math.round(count/total*100)}%)  `;
            }
        }
        container.textContent = text;
    } catch (e) {
        console.error('Ошибка получения голосов:', e);
        container.textContent = 'Ошибка загрузки голосов';
    }
}

// --- Закрыть лобби ---
function closeLobby() {
    document.getElementById('lobbyModal').style.display = 'none';
    if (roomChannel) {
        supabase.removeChannel(roomChannel);
        roomChannel = null;
    }
    if (votesChannel) {
        supabase.removeChannel(votesChannel);
        votesChannel = null;
    }
    currentRoomId = null;
}
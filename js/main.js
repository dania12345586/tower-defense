import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser, loadProgress, saveProgress } from './auth.js';
import { initAdminPanel } from './adminPanel.js';
import { createRoomHandler, renderRoomList } from './lobby.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

const MAX_TOWERS = 4;
let selectedTowers = ['pistol', 'flame', 'dj'];
let unlockedTowers = ['pistol', 'flame', 'dj'];
let coins = 0;
let userId = null;
let rememberMe = true;
let achievements = [];

// Достижения
const ACHIEVEMENTS = {
    FIRST_WIN: {
        id: 'first_win',
        name: 'Первая победа',
        desc: 'Выиграйте свою первую игру',
        reward: 'shotgun',
        icon: '🏆'
    },
};

document.getElementById('rememberMe').addEventListener('change', (e) => {
    rememberMe = e.target.checked;
});

function startGameEngine() {
    if (!window.game) {
        window.game = new GameEngine();
        initAdminPanel();
    }
}

function updateCoinsDisplay() {
    const coinsDisplay = document.getElementById('coinsDisplay');
    if (coinsDisplay) coinsDisplay.textContent = coins;
    if (window.game) window.game.state.coins = coins;
    renderShopModal();
}

function renderSelectedTowers() {
    const container = document.getElementById('selectedTowersDisplay');
    if (!container) return;
    container.innerHTML = '';
    if (selectedTowers.length === 0) {
        container.innerHTML = '<span style="color:#888; font-size:0.9rem;">Ничего не выбрано</span>';
        return;
    }
    const icons = { pistol: '🔫', flame: '🔥', dj: '🎧', electric: '⚡', laser: '🔴', shotgun: '💥' };
    selectedTowers.forEach(type => {
        const span = document.createElement('span');
        span.className = 'selected-tower-icon';
        span.textContent = icons[type] || '❓';
        span.title = type;
        container.appendChild(span);
    });
}

function updateTowerSelectionModal() {
    document.querySelectorAll('#towerSelectModal .tower-card').forEach(card => {
        const type = card.dataset.tower;
        card.style.display = unlockedTowers.includes(type) ? 'flex' : 'none';
    });
    selectedTowers = selectedTowers.filter(t => unlockedTowers.includes(t));
    renderSelectedTowers();
    window._selectedTowers = selectedTowers;
}

function updateModalState() {
    document.querySelectorAll('#towerSelectModal .tower-card').forEach(card => {
        const type = card.dataset.tower;
        card.classList.toggle('selected', selectedTowers.includes(type));
        card.style.display = unlockedTowers.includes(type) ? 'flex' : 'none';
    });
}

function openTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'flex';
    updateModalState();
    document.getElementById('towerSelectWarning').textContent = '';
}

function closeTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'none';
}

function handleTowerCardClick(e) {
    const card = e.target.closest('.tower-card');
    if (!card) return;
    const type = card.dataset.tower;
    if (!type || !unlockedTowers.includes(type)) return;
    if (selectedTowers.includes(type)) {
        selectedTowers = selectedTowers.filter(t => t !== type);
        card.classList.remove('selected');
        document.getElementById('towerSelectWarning').textContent = '';
    } else {
        if (selectedTowers.length >= MAX_TOWERS) {
            document.getElementById('towerSelectWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
            return;
        }
        selectedTowers.push(type);
        card.classList.add('selected');
        document.getElementById('towerSelectWarning').textContent = '';
    }
}

function saveTowerSelection() {
    if (selectedTowers.length === 0) {
        document.getElementById('towerSelectWarning').textContent = '❌ Выберите хотя бы одну башню!';
        return;
    }
    window._selectedTowers = selectedTowers;
    renderSelectedTowers();
    closeTowerSelectModal();
}

function cancelTowerSelection() {
    selectedTowers = (window._selectedTowers || ['pistol', 'flame', 'dj']).filter(t => unlockedTowers.includes(t));
    updateModalState();
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- Магазин -----
function openShopModal() {
    document.getElementById('shopModal').style.display = 'flex';
    renderShopModal();
}
function closeShopModal() {
    document.getElementById('shopModal').style.display = 'none';
}
function renderShopModal() {
    const container = document.getElementById('shopItemsContainer');
    if (!container) return;
    container.innerHTML = '';
    const items = [
        { id: 'electric', label: '⚡ Электрошокер', cost: 150, unlocked: unlockedTowers.includes('electric') },
        { id: 'laser', label: '🔴 Лазер', cost: 400, unlocked: unlockedTowers.includes('laser') }
    ];
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item-modal';
        div.style.cssText = 'background:rgba(255,255,255,0.05); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #444;';
        div.innerHTML = `<span style="font-size:1.1rem;">${item.label}</span><span style="color:#aaa;">${item.cost}🪙</span>`;
        if (item.unlocked) {
            const bought = document.createElement('span');
            bought.textContent = ' ✅ Куплено';
            bought.style.color = '#2ecc71';
            div.appendChild(bought);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = 'Купить';
            btn.style.padding = '4px 16px';
            btn.style.fontSize = '0.9rem';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                buyItem(item.id, item.cost);
            });
            div.appendChild(btn);
        }
        container.appendChild(div);
    });
    document.getElementById('shopCoinsDisplay').textContent = coins;
}

async function buyItem(itemId, cost) {
    if (coins < cost) { alert('Недостаточно монет!'); return; }
    if (unlockedTowers.includes(itemId)) { alert('Уже куплено!'); return; }
    coins -= cost;
    unlockedTowers.push(itemId);
    if (userId) {
        try {
            await saveProgress(userId, { coins, unlocked_towers: unlockedTowers, achievements });
        } catch (e) { console.warn(e); }
    }
    updateCoinsDisplay();
    renderShopModal();
    updateTowerSelectionModal();
    alert(`✅ ${itemId} куплен!`);
}

// ----- Достижения -----
function renderAchievementsModal() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    container.innerHTML = '';
    const allAchievements = Object.values(ACHIEVEMENTS);
    allAchievements.forEach(a => {
        const unlocked = achievements.includes(a.id);
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:6px;';
        div.innerHTML = `
            <span>${a.icon} ${a.name}</span>
            <span style="font-size:0.8rem; color:${unlocked ? '#2ecc71' : '#888'};">
                ${unlocked ? '✅ Разблокировано' : a.desc}
            </span>
        `;
        container.appendChild(div);
    });
}

function openAchievementsModal() {
    document.getElementById('achievementsModal').style.display = 'flex';
    renderAchievementsModal();
}
function closeAchievementsModal() {
    document.getElementById('achievementsModal').style.display = 'none';
}

// Проверка достижений (вызывается при победе)
window.checkAchievements = function(state) {
    if (!state || !state.userId) return;
    let newAchievements = [];
    if (!achievements.includes('first_win')) {
        newAchievements.push('first_win');
    }
    if (newAchievements.length > 0) {
        achievements = [...achievements, ...newAchievements];
        if (newAchievements.includes('first_win')) {
            if (!unlockedTowers.includes('shotgun')) {
                unlockedTowers.push('shotgun');
                // Автоматически добавляем дробовик в выбранные башни
                if (selectedTowers.length < MAX_TOWERS) {
                    selectedTowers.push('shotgun');
                } else {
                    // заменяем последнюю
                    selectedTowers[selectedTowers.length - 1] = 'shotgun';
                }
                window._selectedTowers = selectedTowers;
                renderSelectedTowers();
                alert('🏆 Достижение разблокировано: Первая победа! Вы получили башню Дробовик!');
            }
        }
        if (userId) {
            saveProgress(userId, { coins, unlocked_towers: unlockedTowers, achievements }).catch(console.warn);
        }
        updateTowerSelectionModal();
        renderAchievementsModal();
    }
};

// ----- Инициализация игры -----
async function initGameWithUser(user) {
    userId = user.id;
    window._userId = userId;
    window._username = user.username;
    try {
        const progress = await loadProgress(userId);
        if (progress) {
            coins = progress.coins || 0;
            unlockedTowers = progress.unlocked_towers || ['pistol', 'flame', 'dj'];
            achievements = progress.achievements || [];
            selectedTowers = unlockedTowers.slice(0, MAX_TOWERS);
            if (selectedTowers.length === 0) selectedTowers = ['pistol'];
            window._selectedTowers = selectedTowers;
        }
    } catch (e) { console.warn(e); }
    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    startGameEngine();
    updateCoinsDisplay();
    renderSelectedTowers();
    updateTowerSelectionModal();
}

// ----- Авторизация -----
const savedUser = getCurrentUser();
if (savedUser) {
    initGameWithUser(savedUser);
} else {
    clearCurrentUser();
}

document.getElementById('authRegisterBtn').addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!username || !password) { authMessage.textContent = 'Заполните все поля!'; return; }
    try {
        await register(username, password);
        authMessage.style.color = '#00ff88';
        authMessage.textContent = '✅ Регистрация успешна! Теперь войдите.';
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
    } catch (e) { authMessage.textContent = '❌ ' + e.message; }
});

document.getElementById('authLoginBtn').addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!username || !password) { authMessage.textContent = 'Введите имя и пароль!'; return; }
    try {
        const user = await login(username, password);
        if (rememberMe) {
            setCurrentUser(user);
        } else {
            clearCurrentUser();
            window._userId = user.id;
            window._username = user.username;
        }
        await initGameWithUser(user);
    } catch (e) { authMessage.textContent = '❌ ' + e.message; }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Выйти из аккаунта?')) {
        clearCurrentUser();
        window._userId = null;
        window._username = null;
        location.reload();
    }
});

// ----- Кнопки меню -----
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (selectedTowers.length === 0) { alert('Выберите хотя бы одну башню!'); return; }
    window._selectedTowers = selectedTowers;
    window._isMultiplayer = false;
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
});

document.getElementById('shopBtn').addEventListener('click', openShopModal);
document.getElementById('closeShopBtn').addEventListener('click', closeShopModal);
document.getElementById('shopModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeShopModal(); });

document.getElementById('openTowerSelectBtn').addEventListener('click', openTowerSelectModal);
document.getElementById('saveTowerSelectBtn').addEventListener('click', saveTowerSelection);
document.getElementById('cancelTowerSelectBtn').addEventListener('click', cancelTowerSelection);
document.getElementById('towerSelectModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cancelTowerSelection();
});
document.getElementById('towerSelectModal').addEventListener('click', handleTowerCardClick);

// ----- Достижения -----
document.getElementById('achievementsBtn').addEventListener('click', openAchievementsModal);
document.getElementById('closeAchievementsBtn').addEventListener('click', closeAchievementsModal);
document.getElementById('achievementsModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAchievementsModal();
});

// ----- Мультиплеер -----
document.getElementById('multiplayerBtn').addEventListener('click', () => {
    const user = getCurrentUser() || { id: window._userId };
    if (!user?.id) { alert('Войдите в аккаунт!'); return; }
    document.getElementById('roomListModal').style.display = 'flex';
    renderRoomList();
});
document.getElementById('createRoomBtn').addEventListener('click', createRoomHandler);
document.getElementById('closeRoomListBtn').addEventListener('click', () => {
    document.getElementById('roomListModal').style.display = 'none';
});

// ----- Подсветка карт -----
document.querySelectorAll('.map-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        const radio = this.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });
});

window._selectedTowers = selectedTowers;
renderSelectedTowers();
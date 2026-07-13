import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser, loadProgress, saveProgress } from './auth.js';
import { initAdminPanel } from './adminPanel.js';
import { createRoomHandler, renderRoomList } from './lobby.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
const MAX_TOWERS = 4;
let selectedTowers = ['pistol', 'flame', 'dj'];
let unlockedTowers = ['pistol', 'flame', 'dj'];
let coins = 0;
let userId = null;

// ----- ФУНКЦИЯ ЗАПУСКА ИГРЫ -----
function startGameEngine() {
    if (!window.game) {
        window.game = new GameEngine();
        initAdminPanel();
    }
}

// ----- ОБНОВЛЕНИЕ МОНЕТ -----
function updateCoinsDisplay() {
    const coinsDisplay = document.getElementById('coinsDisplay');
    if (coinsDisplay) {
        coinsDisplay.textContent = coins;
    }
    if (window.game) {
        window.game.coins = coins;
    }
    renderShopModal();
}

// ----- ОТОБРАЖЕНИЕ ВЫБРАННЫХ БАШЕН -----
function renderSelectedTowers() {
    const container = document.getElementById('selectedTowersDisplay');
    if (!container) return;
    container.innerHTML = '';
    if (selectedTowers.length === 0) {
        container.innerHTML = '<span style="color:#888; font-size:0.9rem;">Ничего не выбрано</span>';
        return;
    }
    const icons = {
        pistol: '🔫',
        flame: '🔥',
        dj: '🎧',
        electric: '⚡',
        laser: '🔴'
    };
    selectedTowers.forEach(type => {
        const span = document.createElement('span');
        span.className = 'selected-tower-icon';
        span.textContent = icons[type] || '❓';
        span.title = type;
        container.appendChild(span);
    });
}

// ----- ОБНОВЛЕНИЕ МОДАЛКИ ВЫБОРА БАШЕН -----
function updateTowerSelectionModal() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        const type = card.dataset.tower;
        if (unlockedTowers.includes(type)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    selectedTowers = selectedTowers.filter(t => unlockedTowers.includes(t));
    renderSelectedTowers();
    window._selectedTowers = selectedTowers;
}

function updateModalState() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        const type = card.dataset.tower;
        if (selectedTowers.includes(type)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        if (unlockedTowers.includes(type)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// ----- МОДАЛКА ВЫБОРА -----
function openTowerSelectModal() {
    const modal = document.getElementById('towerSelectModal');
    updateModalState();
    document.getElementById('towerSelectWarning').textContent = '';
    modal.style.display = 'flex';
}
function closeTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'none';
}
function handleTowerCardClick(e) {
    const card = e.target.closest('.tower-card');
    if (!card) return;
    const type = card.dataset.tower;
    if (!type) return;
    if (!unlockedTowers.includes(type)) return;
    if (selectedTowers.includes(type)) {
        selectedTowers = selectedTowers.filter(t => t !== type);
        card.classList.remove('selected');
        document.getElementById('towerSelectWarning').textContent = '';
        return;
    }
    if (selectedTowers.length >= MAX_TOWERS) {
        document.getElementById('towerSelectWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
        return;
    }
    selectedTowers.push(type);
    card.classList.add('selected');
    document.getElementById('towerSelectWarning').textContent = '';
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
    if (window._selectedTowers) {
        selectedTowers = [...window._selectedTowers];
    } else {
        selectedTowers = ['pistol', 'flame', 'dj'];
    }
    selectedTowers = selectedTowers.filter(t => unlockedTowers.includes(t));
    updateModalState();
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- МАГАЗИН -----
function openShopModal() {
    const modal = document.getElementById('shopModal');
    renderShopModal();
    modal.style.display = 'flex';
}
function closeShopModal() {
    document.getElementById('shopModal').style.display = 'none';
}
function renderShopModal() {
    const container = document.getElementById('shopItemsContainer');
    if (!container) return;
    container.innerHTML = '';
    const shopItems = [
        { id: 'electric', label: '⚡ Электрошокер', cost: 150, unlocked: unlockedTowers.includes('electric') },
        { id: 'laser', label: '🔴 Лазер', cost: 400, unlocked: unlockedTowers.includes('laser') }
    ];
    shopItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item-modal';
        div.style.cssText = 'background:rgba(255,255,255,0.05); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid #444;';
        div.innerHTML = `
            <span style="font-size:1.1rem;">${item.label}</span>
            <span style="color:#aaa;">${item.cost}🪙</span>
        `;
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
    const coinDisplay = document.getElementById('shopCoinsDisplay');
    if (coinDisplay) coinDisplay.textContent = coins;
}
async function buyItem(itemId, cost) {
    if (coins < cost) {
        alert('Недостаточно монет!');
        return;
    }
    if (unlockedTowers.includes(itemId)) {
        alert('Уже куплено!');
        return;
    }
    coins -= cost;
    unlockedTowers.push(itemId);
    if (userId) {
        try {
            await saveProgress(userId, {
                coins: coins,
                unlocked_towers: unlockedTowers,
                achievements: window.game ? window.game.achievements : []
            });
            console.log('Покупка сохранена');
        } catch (e) {
            console.warn('Ошибка сохранения покупки:', e);
        }
    }
    updateCoinsDisplay();
    renderShopModal();
    updateTowerSelectionModal();
    alert(`✅ ${itemId} куплен!`);
}

// ----- ЗАГРУЗКА ПОЛЬЗОВАТЕЛЯ -----
async function loadUserData() {
    const savedUser = getCurrentUser();
    if (!savedUser) return;
    userId = savedUser.id;
    window._userId = userId;
    window._username = savedUser.username;

    try {
        const progress = await loadProgress(userId);
        if (progress) {
            coins = progress.coins || 0;
            unlockedTowers = progress.unlocked_towers || ['pistol', 'flame', 'dj'];
            selectedTowers = unlockedTowers.slice(0, MAX_TOWERS);
            if (selectedTowers.length === 0) selectedTowers = ['pistol'];
            window._selectedTowers = selectedTowers;
        }
    } catch (e) {
        console.warn('Не удалось загрузить данные:', e);
    }

    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    startGameEngine();
    updateCoinsDisplay();
    renderSelectedTowers();
    updateTowerSelectionModal();
}

// ----- АВТОРИЗАЦИЯ -----
const savedUser = getCurrentUser();
if (savedUser) {
    loadUserData();
} else {
    clearCurrentUser();
}

document.getElementById('authRegisterBtn').addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!username || !password) {
        authMessage.textContent = 'Заполните все поля!';
        return;
    }
    try {
        await register(username, password);
        authMessage.style.color = '#00ff88';
        authMessage.textContent = '✅ Регистрация успешна! Теперь войдите.';
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
    } catch (e) {
        authMessage.textContent = '❌ ' + e.message;
    }
});

document.getElementById('authLoginBtn').addEventListener('click', async () => {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!username || !password) {
        authMessage.textContent = 'Введите имя и пароль!';
        return;
    }
    try {
        const user = await login(username, password);
        setCurrentUser(user);
        loadUserData();
    } catch (e) {
        authMessage.textContent = '❌ ' + e.message;
    }
});

// ----- КНОПКИ МЕНЮ -----
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (selectedTowers.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    window._selectedTowers = selectedTowers;
    window._isMultiplayer = false;
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
});

document.getElementById('shopBtn').addEventListener('click', openShopModal);
document.getElementById('closeShopBtn').addEventListener('click', closeShopModal);
document.getElementById('shopModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeShopModal();
});

document.getElementById('openTowerSelectBtn').addEventListener('click', openTowerSelectModal);
document.getElementById('saveTowerSelectBtn').addEventListener('click', saveTowerSelection);
document.getElementById('cancelTowerSelectBtn').addEventListener('click', cancelTowerSelection);
document.getElementById('towerSelectModal').addEventListener('click', handleTowerCardClick);
document.getElementById('towerSelectModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cancelTowerSelection();
});

// ----- МУЛЬТИПЛЕЕР -----
document.getElementById('multiplayerBtn').addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) {
        alert('Войдите в аккаунт!');
        return;
    }
    document.getElementById('roomListModal').style.display = 'flex';
    renderRoomList();
});

document.getElementById('createRoomBtn').addEventListener('click', createRoomHandler);
document.getElementById('closeRoomListBtn').addEventListener('click', () => {
    document.getElementById('roomListModal').style.display = 'none';
});

// ----- ПОДСВЕТКА КАРТ -----
document.querySelectorAll('.map-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        const radio = this.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });
});

// Инициализация
window._selectedTowers = selectedTowers;
renderSelectedTowers();
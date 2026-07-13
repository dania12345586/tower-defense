import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser } from './auth.js';
import { initAdminPanel } from './adminPanel.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
const MAX_TOWERS = 4;
let selectedTowers = ['pistol', 'flame'];

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
    if (coinsDisplay && window.game) {
        coinsDisplay.textContent = window.game.coins || 0;
    }
}

// ----- ОТОБРАЖЕНИЕ ВЫБРАННЫХ БАШЕН В ГЛАВНОМ МЕНЮ -----
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
        electric: '⚡'
    };
    selectedTowers.forEach(type => {
        const span = document.createElement('span');
        span.className = 'selected-tower-icon';
        span.textContent = icons[type] || '❓';
        span.title = type;
        container.appendChild(span);
    });
}

// ----- ОБНОВЛЕНИЕ СОСТОЯНИЯ МОДАЛКИ -----
function updateModalState() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        const type = card.dataset.tower;
        if (selectedTowers.includes(type)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// ----- ОТКРЫТИЕ МОДАЛКИ -----
function openTowerSelectModal() {
    const modal = document.getElementById('towerSelectModal');
    updateModalState();
    document.getElementById('towerSelectWarning').textContent = '';
    modal.style.display = 'flex';
}

// ----- ЗАКРЫТИЕ МОДАЛКИ -----
function closeTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'none';
}

// ----- ОБРАБОТЧИК КЛИКА ПО КАРТОЧКЕ -----
function handleTowerCardClick(e) {
    const card = e.target.closest('.tower-card');
    if (!card) return;
    const type = card.dataset.tower;
    if (!type) return;

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

// ----- СОХРАНЕНИЕ -----
function saveTowerSelection() {
    if (selectedTowers.length === 0) {
        document.getElementById('towerSelectWarning').textContent = '❌ Выберите хотя бы одну башню!';
        return;
    }
    window._selectedTowers = selectedTowers;
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- ОТМЕНА -----
function cancelTowerSelection() {
    if (window._selectedTowers) {
        selectedTowers = [...window._selectedTowers];
    } else {
        selectedTowers = ['pistol', 'flame'];
    }
    updateModalState();
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- АВТОРИЗАЦИЯ -----
const savedUser = getCurrentUser();
if (savedUser) {
    window._userId = savedUser.id;
    window._username = savedUser.username;
    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    startGameEngine();
    updateCoinsDisplay();
    renderSelectedTowers();
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
        window._userId = user.id;
        window._username = user.username;
        authMessage.style.color = '#00ff88';
        authMessage.textContent = '✅ Вход выполнен!';
        authScreen.style.display = 'none';
        mainMenu.style.display = 'flex';
        startGameEngine();
        updateCoinsDisplay();
        renderSelectedTowers();
    } catch (e) {
        authMessage.textContent = '❌ ' + e.message;
    }
});

// ----- КНОПКА "ИГРАТЬ" (ПЕРЕХОД НА ВЫБОР КАРТЫ) -----
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (selectedTowers.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    window._selectedTowers = selectedTowers;
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
    console.log('Переход на выбор карты, башни:', selectedTowers);
});

// ----- МАГАЗИН (заглушка) -----
document.getElementById('shopBtn').addEventListener('click', () => {
    alert('🛒 Магазин временно недоступен. Скоро появится!');
});

// ----- ОТКРЫТИЕ МОДАЛКИ -----
document.getElementById('openTowerSelectBtn').addEventListener('click', openTowerSelectModal);

// ----- СОХРАНЕНИЕ / ОТМЕНА -----
document.getElementById('saveTowerSelectBtn').addEventListener('click', saveTowerSelection);
document.getElementById('cancelTowerSelectBtn').addEventListener('click', cancelTowerSelection);

// ----- ДЕЛЕГИРОВАНИЕ КЛИКА НА МОДАЛКЕ -----
document.getElementById('towerSelectModal').addEventListener('click', handleTowerCardClick);

// ----- ЗАКРЫТИЕ ПО КЛИКУ НА ОВЕРЛЕЙ -----
document.getElementById('towerSelectModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        cancelTowerSelection();
    }
});

// Инициализация
window._selectedTowers = selectedTowers;
renderSelectedTowers();
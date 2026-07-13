import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser } from './auth.js';
import { initAdminPanel } from './adminPanel.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
let selectedTowers = ['pistol', 'flame']; // по умолчанию выбраны
let tempSelectedTowers = [...selectedTowers]; // для модалки

// ----- ФУНКЦИЯ ЗАПУСКА ИГРЫ -----
function startGameEngine() {
    if (!window.game) {
        window.game = new GameEngine();
        initAdminPanel();
    }
}

// ----- ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ МОНЕТ -----
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

// ----- ОТКРЫТИЕ МОДАЛКИ ВЫБОРА БАШЕН -----
function openTowerSelectModal() {
    const modal = document.getElementById('towerSelectModal');
    // Синхронизируем чекбоксы с текущим выбором
    document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
        cb.checked = selectedTowers.includes(cb.value);
        const card = cb.closest('.tower-card');
        if (card) card.classList.toggle('selected', cb.checked);
    });
    tempSelectedTowers = [...selectedTowers];
    modal.style.display = 'flex';
}

// ----- ЗАКРЫТИЕ МОДАЛКИ (без сохранения) -----
function closeTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'none';
}

// ----- СОХРАНЕНИЕ ВЫБОРА ИЗ МОДАЛКИ -----
function saveTowerSelection() {
    const checked = document.querySelectorAll('#towerSelectModal .tower-checkbox:checked');
    const newSelection = Array.from(checked).map(cb => cb.value);
    if (newSelection.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    selectedTowers = newSelection;
    window._selectedTowers = selectedTowers;
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

// ----- КНОПКА "ИГРАТЬ" В ГЛАВНОМ МЕНЮ -----
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (selectedTowers.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    window._selectedTowers = selectedTowers;
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
});

// ----- МАГАЗИН (заглушка) -----
document.getElementById('shopBtn').addEventListener('click', () => {
    alert('🛒 Магазин временно недоступен. Скоро появится!');
});

// ----- ОТКРЫТИЕ МОДАЛКИ ВЫБОРА БАШЕН -----
document.getElementById('openTowerSelectBtn').addEventListener('click', openTowerSelectModal);

// ----- СОХРАНЕНИЕ / ОТМЕНА В МОДАЛКЕ -----
document.getElementById('saveTowerSelectBtn').addEventListener('click', saveTowerSelection);
document.getElementById('cancelTowerSelectBtn').addEventListener('click', () => {
    // Возвращаем чекбоксы к предыдущему состоянию
    document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
        cb.checked = selectedTowers.includes(cb.value);
        const card = cb.closest('.tower-card');
        if (card) card.classList.toggle('selected', cb.checked);
    });
    closeTowerSelectModal();
});

// ----- ПЕРЕКЛЮЧЕНИЕ КАРТОЧЕК В МОДАЛКЕ (через клик по карточке) -----
document.querySelectorAll('#towerSelectModal .tower-card').forEach(card => {
    const checkbox = card.querySelector('.tower-checkbox');
    card.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);
    });
    // Синхронизация при изменении чекбокса (на случай клика по самому чекбоксу)
    checkbox.addEventListener('change', () => {
        card.classList.toggle('selected', checkbox.checked);
    });
});

// ----- ЗАКРЫТИЕ МОДАЛКИ ПО КЛИКУ НА ОВЕРЛЕЙ (но не по контенту) -----
document.getElementById('towerSelectModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        // Отмена без сохранения
        document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
            cb.checked = selectedTowers.includes(cb.value);
            const card = cb.closest('.tower-card');
            if (card) card.classList.toggle('selected', cb.checked);
        });
        closeTowerSelectModal();
    }
});

// Инициализация при загрузке
window._selectedTowers = selectedTowers;
renderSelectedTowers();
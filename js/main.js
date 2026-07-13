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
let tempSelectedTowers = [...selectedTowers];

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

// ----- ОТКРЫТИЕ МОДАЛКИ -----
function openTowerSelectModal() {
    const modal = document.getElementById('towerSelectModal');
    // Синхронизируем чекбоксы с текущим выбором
    document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
        cb.checked = selectedTowers.includes(cb.value);
        const card = cb.closest('.tower-card');
        if (card) card.classList.toggle('selected', cb.checked);
    });
    tempSelectedTowers = [...selectedTowers];
    document.getElementById('towerSelectWarning').textContent = '';
    modal.style.display = 'flex';
}

// ----- ЗАКРЫТИЕ МОДАЛКИ (без сохранения) -----
function closeTowerSelectModal() {
    document.getElementById('towerSelectModal').style.display = 'none';
}

// ----- СОХРАНЕНИЕ ВЫБОРА -----
function saveTowerSelection() {
    const checked = document.querySelectorAll('#towerSelectModal .tower-checkbox:checked');
    if (checked.length === 0) {
        document.getElementById('towerSelectWarning').textContent = '❌ Выберите хотя бы одну башню!';
        return;
    }
    if (checked.length > MAX_TOWERS) {
        document.getElementById('towerSelectWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
        return;
    }
    const newSelection = Array.from(checked).map(cb => cb.value);
    selectedTowers = newSelection;
    window._selectedTowers = selectedTowers;
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ (делегирование) -----
function initTowerSelection() {
    const modal = document.getElementById('towerSelectModal');
    // Удаляем старые обработчики, если есть (но через делегирование они не мешают)
    // Вешаем один обработчик на всю модалку
    modal.addEventListener('click', function(e) {
        // Находим ближайшую карточку башни
        const card = e.target.closest('.tower-card');
        if (!card) return;
        // Если клик по чекбоксу – игнорируем (он скрыт, но на всякий случай)
        if (e.target.tagName === 'INPUT') return;

        const cb = card.querySelector('.tower-checkbox');
        if (!cb) return;

        // Если чекбокс уже выбран – снимаем
        if (cb.checked) {
            cb.checked = false;
            card.classList.remove('selected');
            document.getElementById('towerSelectWarning').textContent = '';
            return;
        }

        // Если не выбран – проверяем лимит
        const checked = document.querySelectorAll('#towerSelectModal .tower-checkbox:checked');
        if (checked.length >= MAX_TOWERS) {
            document.getElementById('towerSelectWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
            return;
        }

        // Выбираем
        cb.checked = true;
        card.classList.add('selected');
        document.getElementById('towerSelectWarning').textContent = '';
    });

    // Также нужно синхронизировать состояние при изменении чекбокса (если вдруг изменится через код)
    modal.addEventListener('change', function(e) {
        if (e.target.classList.contains('tower-checkbox')) {
            const card = e.target.closest('.tower-card');
            if (card) {
                card.classList.toggle('selected', e.target.checked);
            }
        }
    });
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

// ----- КНОПКА "ИГРАТЬ" -----
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

// ----- ОТКРЫТИЕ МОДАЛКИ -----
document.getElementById('openTowerSelectBtn').addEventListener('click', openTowerSelectModal);

// ----- СОХРАНЕНИЕ / ОТМЕНА -----
document.getElementById('saveTowerSelectBtn').addEventListener('click', saveTowerSelection);
document.getElementById('cancelTowerSelectBtn').addEventListener('click', () => {
    // Возвращаем чекбоксы к предыдущему состоянию
    document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
        cb.checked = selectedTowers.includes(cb.value);
        const card = cb.closest('.tower-card');
        if (card) card.classList.toggle('selected', cb.checked);
    });
    document.getElementById('towerSelectWarning').textContent = '';
    closeTowerSelectModal();
});

// ----- ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ (делегирование) -----
initTowerSelection();

// ----- ЗАКРЫТИЕ МОДАЛКИ ПО КЛИКУ НА ОВЕРЛЕЙ -----
document.getElementById('towerSelectModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        // Отмена без сохранения
        document.querySelectorAll('#towerSelectModal .tower-checkbox').forEach(cb => {
            cb.checked = selectedTowers.includes(cb.value);
            const card = cb.closest('.tower-card');
            if (card) card.classList.toggle('selected', cb.checked);
        });
        document.getElementById('towerSelectWarning').textContent = '';
        closeTowerSelectModal();
    }
});

// Инициализация
window._selectedTowers = selectedTowers;
renderSelectedTowers();
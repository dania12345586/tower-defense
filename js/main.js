import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser } from './auth.js';
import { initAdminPanel } from './adminPanel.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// Функция запуска игры
function startGameEngine() {
    if (!window.game) {
        window.game = new GameEngine();
        initAdminPanel();
    }
}

// Проверка авторизации
const savedUser = getCurrentUser();
if (savedUser) {
    window._userId = savedUser.id;
    window._username = savedUser.username;
    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    startGameEngine();
    updateCoinsDisplay();
} else {
    clearCurrentUser();
}

// Обновление отображения монет в меню
function updateCoinsDisplay() {
    const coinsDisplay = document.getElementById('coinsDisplay');
    if (coinsDisplay && window.game) {
        coinsDisplay.textContent = window.game.coins || 0;
    }
}

// ---- АВТОРИЗАЦИЯ ----
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
    } catch (e) {
        authMessage.textContent = '❌ ' + e.message;
    }
});

// ---- КНОПКА "ИГРАТЬ" В ГЛАВНОМ МЕНЮ ----
document.getElementById('startGameBtn').addEventListener('click', () => {
    // Собираем выбранные башни из чекбоксов в левой колонке
    const checked = document.querySelectorAll('#mainMenu .tower-checkbox:checked');
    if (checked.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    const selectedTowers = Array.from(checked).map(cb => cb.value);
    window._selectedTowers = selectedTowers;

    // Скрываем главное меню, показываем выбор карты
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
});

// ---- МАГАЗИН (заглушка) ----
document.getElementById('shopBtn').addEventListener('click', () => {
    alert('🛒 Магазин временно недоступен. Скоро появится!');
});

// ---- ПЕРЕКЛЮЧЕНИЕ ВЫБОРА БАШЕН (чекбоксы) ----
document.querySelectorAll('#mainMenu .tower-card-vertical').forEach(card => {
    const checkbox = card.querySelector('.tower-checkbox');
    card.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);
    });
    if (checkbox.checked) card.classList.add('selected');
});
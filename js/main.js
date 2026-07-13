import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser } from './auth.js';
import { initAdminPanel } from './adminPanel.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const towerSelectMenu = document.getElementById('towerSelectMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// Функция для запуска игры (создаёт экземпляр)
function startGameEngine() {
    if (!window.game) {
        window.game = new GameEngine();
        initAdminPanel(); // инициализируем админ-панель после создания игры
    }
}

// Проверяем валидного пользователя
const savedUser = getCurrentUser();
if (savedUser) {
    window._userId = savedUser.id;
    window._username = savedUser.username;
    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    // Создаём игру сразу после авторизации
    startGameEngine();
} else {
    clearCurrentUser();
}

// Регистрация
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

// Вход
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
        // Создаём игру после входа
        startGameEngine();
    } catch (e) {
        authMessage.textContent = '❌ ' + e.message;
    }
});

// Кнопка "Играть" в главном меню
document.getElementById('startGameBtn').addEventListener('click', () => {
    mainMenu.style.display = 'none';
    towerSelectMenu.style.display = 'flex';
});

// Остальные переходы (выбор башен, карт) обрабатываются в engine.js
// При нажатии "Играть!" в mapSelectMenu вызывается engine.startGame()
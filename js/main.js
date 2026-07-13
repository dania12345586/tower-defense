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

// ----- ПРИВЯЗКА ОБРАБОТЧИКОВ НА КАРТОЧКИ (ПРЯМО) -----
function attachTowerCardHandlers() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        // Удаляем старые обработчики через клонирование
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        const cb = newCard.querySelector('.tower-checkbox');
        
        // Обработчик клика по карточке
        newCard.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return; // игнорируем клик по скрытому чекбоксу (он невидим)
            
            if (cb.checked) {
                // Снимаем выбор
                cb.checked = false;
                this.classList.remove('selected');
                document.getElementById('towerSelectWarning').textContent = '';
            } else {
                // Проверяем лимит
                const checked = document.querySelectorAll('#towerSelectModal .tower-checkbox:checked');
                if (checked.length >= MAX_TOWERS) {
                    document.getElementById('towerSelectWarning').textContent = `❌ Нельзя выбрать больше ${MAX_TOWERS} башен!`;
                    return;
                }
                // Выбираем
                cb.checked = true;
                this.classList.add('selected');
                document.getElementById('towerSelectWarning').textContent = '';
            }
        });
        
        // Синхронизация при изменении чекбокса (если изменится программно)
        cb.addEventListener('change', function() {
            const parent = this.closest('.tower-card');
            if (this.checked) parent.classList.add('selected');
            else parent.classList.remove('selected');
        });
        
        // Восстанавливаем состояние
        if (cb.checked) newCard.classList.add('selected');
        else newCard.classList.remove('selected');
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
    
    // ПРИВЯЗЫВАЕМ ОБРАБОТЧИКИ ЗАНОВО (после отображения)
    attachTowerCardHandlers();
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
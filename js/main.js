import { GameEngine } from './engine.js';
import { register, login, getCurrentUser, setCurrentUser, clearCurrentUser } from './auth.js';
import { initAdminPanel } from './adminPanel.js';
import { saveProgress } from './auth.js';

const authScreen = document.getElementById('authScreen');
const mainMenu = document.getElementById('mainMenu');
const mapSelectMenu = document.getElementById('mapSelectMenu');
const gameContainer = document.getElementById('gameContainer');
const authMessage = document.getElementById('authMessage');

// ----- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ -----
const MAX_TOWERS = 4;
let selectedTowers = ['pistol', 'flame', 'dj']; // по умолчанию
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
    // Обновляем монеты в игре
    if (window.game) {
        window.game.coins = coins;
    }
}

// ----- ОБНОВЛЕНИЕ МАГАЗИНА -----
function renderShop() {
    const shopContainer = document.getElementById('shopItemsContainer');
    if (!shopContainer) return;
    shopContainer.innerHTML = '';

    const shopItems = [
        { id: 'electric', label: '⚡ Электрошокер', cost: 150, unlocked: unlockedTowers.includes('electric') },
        { id: 'laser', label: '🔴 Лазер', cost: 400, unlocked: unlockedTowers.includes('laser') }
    ];

    shopItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <span>${item.label}</span>
            <span style="font-size:0.8rem; color:#aaa;">${item.cost}🪙</span>
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
            btn.style.padding = '4px 12px';
            btn.style.fontSize = '0.8rem';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                buyItem(item.id, item.cost);
            });
            div.appendChild(btn);
        }
        shopContainer.appendChild(div);
    });
}

// ----- ПОКУПКА -----
async function buyItem(itemId, cost) {
    if (coins < cost) {
        alert('Недостаточно монет!');
        return;
    }
    if (unlockedTowers.includes(itemId)) {
        alert('Уже куплено!');
        return;
    }
    // Проверяем, не превысит ли количество доступных башен (это не лимит, просто для UI)
    // Списываем монеты
    coins -= cost;
    unlockedTowers.push(itemId);
    // Сохраняем в базу
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
    // Обновляем UI
    updateCoinsDisplay();
    renderShop();
    // Если модалка открыта – обновим её содержимое
    updateTowerSelectionModal();
    alert(`✅ ${itemId} куплен!`);
}

// ----- ОБНОВЛЕНИЕ МОДАЛКИ ВЫБОРА БАШЕН -----
function updateTowerSelectionModal() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        const type = card.dataset.tower;
        if (unlockedTowers.includes(type)) {
            card.style.display = 'flex'; // показываем
        } else {
            card.style.display = 'none'; // скрываем
        }
    });
    // Обновляем выбранные – убираем те, что больше не разблокированы
    selectedTowers = selectedTowers.filter(t => unlockedTowers.includes(t));
    renderSelectedTowers();
    // Синхронизируем глобальную переменную
    window._selectedTowers = selectedTowers;
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

// ----- ОБНОВЛЕНИЕ СОСТОЯНИЯ МОДАЛКИ (при открытии) -----
function updateModalState() {
    const cards = document.querySelectorAll('#towerSelectModal .tower-card');
    cards.forEach(card => {
        const type = card.dataset.tower;
        if (selectedTowers.includes(type)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        // Показываем только разблокированные
        if (unlockedTowers.includes(type)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
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
    if (!unlockedTowers.includes(type)) return; // не должно случиться, но на всякий случай

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
        selectedTowers = ['pistol', 'flame', 'dj'];
    }
    // Фильтруем по разблокированным
    selectedTowers = selectedTowers.filter(t => unlockedTowers.includes(t));
    updateModalState();
    renderSelectedTowers();
    closeTowerSelectModal();
}

// ----- ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ -----
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
            // Инициализируем выбранные башни (по умолчанию все разблокированные, но не более 4)
            selectedTowers = unlockedTowers.slice(0, MAX_TOWERS);
            if (selectedTowers.length === 0) selectedTowers = ['pistol'];
            // Сохраняем в глобальную переменную для engine
            window._selectedTowers = selectedTowers;
        }
    } catch (e) {
        console.warn('Не удалось загрузить данные:', e);
    }

    // Показываем главное меню
    authScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
    startGameEngine();
    updateCoinsDisplay();
    renderSelectedTowers();
    renderShop();
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

// ----- КНОПКА "ИГРАТЬ" (ПЕРЕХОД НА ВЫБОР КАРТЫ) -----
document.getElementById('startGameBtn').addEventListener('click', () => {
    if (selectedTowers.length === 0) {
        alert('Выберите хотя бы одну башню!');
        return;
    }
    window._selectedTowers = selectedTowers;
    mainMenu.style.display = 'none';
    mapSelectMenu.style.display = 'flex';
});

// ----- МАГАЗИН (уже работает) -----

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
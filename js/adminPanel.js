import { createEnemy } from './enemy.js';

export function initAdminPanel() {
    console.log('✅ initAdminPanel вызвана');

    const panel = document.getElementById('adminPanel');
    const toggleBtn = document.getElementById('toggleAdminPanel');

    if (!panel || !toggleBtn) {
        console.error('❌ Элементы админ-панели не найдены!');
        return;
    }

    // ---- КНОПКА ПОКАЗА/СКРЫТИЯ ----
    toggleBtn.addEventListener('click', () => {
        console.log('🔘 Кнопка админки нажата');
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? 'Скрыть админку' : 'Админ-панель';
    });

    // ---- СТАРЫЕ ОБРАБОТЧИКИ ----
    document.getElementById('adminAddGold').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminGoldAmount').value) || 100;
        if (window.game) {
            window.game.gold += amount;
            window.game.updateUI();
            console.log(`➕ Добавлено ${amount} золота`);
        }
    });

    document.getElementById('adminAddLives').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminLivesAmount').value) || 5;
        if (window.game) {
            window.game.lives += amount;
            window.game.updateUI();
            console.log(`❤️ Добавлено ${amount} жизней`);
        }
    });

    document.getElementById('adminKillEnemies').addEventListener('click', () => {
        if (window.game) {
            for (const e of window.game.enemies) {
                e.hp = 0;
                e.isDead = true;
            }
            console.log('💀 Все враги убиты');
        }
    });

    document.getElementById('adminSetWave').addEventListener('click', () => {
        const wave = parseInt(document.getElementById('adminWaveNumber').value) || 1;
        if (window.game) {
            window.game.waveIndex = wave - 1;
            window.game.wave = wave;
            window.game.updateUI();
            console.log(`🌊 Установлена волна ${wave}`);
        }
    });

    document.getElementById('adminStartWave').addEventListener('click', () => {
        if (window.game) {
            window.game.startWave();
            console.log('▶️ Старт волны');
        }
    });

    document.getElementById('adminFinishWave').addEventListener('click', () => {
        if (window.game) {
            for (const e of window.game.enemies) {
                e.hp = 0;
                e.isDead = true;
            }
            window.game.enemies = [];
            window.game.waveInProgress = false;
            window.game.endWave();
            console.log('🏁 Волна завершена принудительно');
        }
    });

    document.getElementById('adminSetSpeed').addEventListener('click', () => {
        const speed = parseInt(document.getElementById('adminSpeedValue').value) || 1;
        if (window.game) {
            window.game.timeScale = speed;
            window.game.speedBtn.textContent = `Скорость: ${speed}x`;
            console.log(`⚡ Скорость установлена: ${speed}x`);
        }
    });

    document.getElementById('adminClearAll').addEventListener('click', () => {
        if (window.game && confirm('Удалить все башни и врагов?')) {
            window.game.towers = [];
            window.game.enemies = [];
            window.game.bullets = [];
            if (window.game.map) window.game.map.occupiedCells = new Set();
            console.log('🧹 Всё очищено');
        }
    });

    // ---- НОВЫЙ БЛОК: СПАВН ВРАГОВ ----
    document.getElementById('adminSpawnBtn').addEventListener('click', () => {
        spawnEnemy(1);
    });
    document.getElementById('adminSpawnMultipleBtn').addEventListener('click', () => {
        spawnEnemy(5);
    });

    function spawnEnemy(count = 1) {
        if (!window.game) {
            console.warn('⚠️ Игра не создана');
            return;
        }
        const type = document.getElementById('adminSpawnType').value;
        const hpInput = document.getElementById('adminSpawnHp').value;
        const speedInput = document.getElementById('adminSpawnSpeed').value;
        const rewardInput = document.getElementById('adminSpawnReward').value;
        const damageInput = document.getElementById('adminSpawnDamage').value;

        const path = window.game.map.paths[0];
        if (!path) {
            console.warn('⚠️ Нет пути для спавна');
            return;
        }

        for (let i = 0; i < count; i++) {
            const enemy = createEnemy(path, type);
            if (hpInput !== '') enemy.hp = parseFloat(hpInput);
            if (speedInput !== '') enemy.speed = parseFloat(speedInput);
            if (rewardInput !== '') enemy.reward = parseFloat(rewardInput);
            if (damageInput !== '') enemy.damageToBase = parseFloat(damageInput);
            enemy.maxHp = enemy.hp;
            window.game.enemies.push(enemy);
        }
        console.log(`🧟 Создано ${count} врагов типа ${type}`);
    }

    // Панель по умолчанию скрыта
    panel.style.display = 'none';
}
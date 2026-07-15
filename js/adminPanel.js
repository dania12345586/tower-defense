import { ENEMY_TYPES } from './configs/waveConfig.js';
import { createEnemy } from './enemy.js';
import { Megaboss } from './enemy.js';

export function initAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const toggleBtn = document.getElementById('toggleAdminPanel');

    // ---- СТАРЫЕ ОБРАБОТЧИКИ ----
    toggleBtn.addEventListener('click', () => {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? 'Скрыть админку' : 'Админ-панель';
    });

    document.getElementById('adminAddGold').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminGoldAmount').value) || 100;
        if (window.game) {
            window.game.state.gold += amount;
            window.game.ui.updateUI(window.game.state);
        }
    });

    document.getElementById('adminAddLives').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminLivesAmount').value) || 5;
        if (window.game) {
            window.game.state.lives += amount;
            window.game.ui.updateUI(window.game.state);
        }
    });

    document.getElementById('adminKillEnemies').addEventListener('click', () => {
        if (window.game) {
            for (const e of window.game.state.enemies) {
                e.hp = 0;
                e.isDead = true;
            }
        }
    });

    document.getElementById('adminSetWave').addEventListener('click', () => {
        const wave = parseInt(document.getElementById('adminWaveNumber').value) || 1;
        if (window.game) {
            window.game.state.waveIndex = wave - 1;
            window.game.state.wave = wave;
            window.game.ui.updateUI(window.game.state);
        }
    });

    document.getElementById('adminStartWave').addEventListener('click', () => {
        if (window.game) window.game.waveManager?.startWave();
    });

    document.getElementById('adminFinishWave').addEventListener('click', () => {
        if (window.game) {
            for (const e of window.game.state.enemies) {
                e.hp = 0;
                e.isDead = true;
            }
            window.game.state.enemies = [];
            if (window.game.waveManager) {
                window.game.waveManager.waveInProgress = false;
                window.game.waveManager.endWave();
            }
        }
    });

    document.getElementById('adminSetSpeed').addEventListener('click', () => {
        const speed = parseInt(document.getElementById('adminSpeedValue').value) || 1;
        if (window.game) {
            window.game.state.timeScale = speed;
            window.game.speedBtn.textContent = `Скорость: ${speed}x`;
        }
    });

    document.getElementById('adminClearAll').addEventListener('click', () => {
        if (window.game && confirm('Удалить все башни и врагов?')) {
            window.game.state.towers = [];
            window.game.state.enemies = [];
            window.game.state.bullets = [];
            if (window.game.map) window.game.map.occupiedCells = new Set();
            window.game.ui.updateUI(window.game.state);
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

        const path = window.game.map?.paths?.[0];
        if (!path) {
            console.warn('⚠️ Нет пути для спавна');
            return;
        }

        for (let i = 0; i < count; i++) {
            let enemy;
            if (type === 'megaboss_volcano') {
                enemy = new Megaboss(path, true);
            } else if (type === 'megaboss') {
                enemy = new Megaboss(path, false);
            } else {
                enemy = createEnemy(path, type);
            }
            if (hpInput !== '') enemy.hp = parseFloat(hpInput);
            if (speedInput !== '') enemy.speed = parseFloat(speedInput);
            if (rewardInput !== '') enemy.reward = parseFloat(rewardInput);
            if (damageInput !== '') enemy.damageToBase = parseFloat(damageInput);
            enemy.maxHp = enemy.hp;
            window.game.state.enemies.push(enemy);
        }
        console.log(`🧟 Создано ${count} врагов типа ${type}`);
    }

    // ---- НОВЫЙ БЛОК: РЕДАКТОР СТАТОВ БАШНИ ----
    document.getElementById('applyTowerStatsBtn').addEventListener('click', () => {
        if (!window.game || !window.game.selectedTower) {
            alert('❌ Сначала выберите башню на карте (кликните по ней)!');
            return;
        }
        const tower = window.game.selectedTower;
        const damage = parseFloat(document.getElementById('editTowerDamage').value);
        const range = parseFloat(document.getElementById('editTowerRange').value);
        const fireRate = parseFloat(document.getElementById('editTowerFireRate').value);

        if (!isNaN(damage) && damage > 0) tower.damage = damage;
        if (!isNaN(range) && range > 0) tower.range = range;
        if (!isNaN(fireRate) && fireRate > 0) tower.fireRate = fireRate;

        if (tower.baseDamage !== undefined && !isNaN(damage) && damage > 0) tower.baseDamage = damage;
        if (tower.baseFireRate !== undefined && !isNaN(fireRate) && fireRate > 0) tower.baseFireRate = fireRate;

        window.game.updateTowerPanel();
        console.log('✅ Статы башни изменены!');
    });

    // Панель по умолчанию скрыта
    panel.style.display = 'none';
}
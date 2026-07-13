export function initAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const toggleBtn = document.getElementById('toggleAdminPanel');

    toggleBtn.addEventListener('click', () => {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? 'Скрыть админку' : 'Админ-панель';
    });

    document.getElementById('adminAddGold').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminGoldAmount').value) || 100;
        if (window.game) window.game.gold += amount;
        if (window.game) window.game.updateUI();
    });

    document.getElementById('adminAddLives').addEventListener('click', () => {
        const amount = parseInt(document.getElementById('adminLivesAmount').value) || 5;
        if (window.game) window.game.lives += amount;
        if (window.game) window.game.updateUI();
    });

    document.getElementById('adminKillEnemies').addEventListener('click', () => {
        if (window.game) {
            for (const e of window.game.enemies) {
                e.hp = 0;
                e.isDead = true;
            }
        }
    });

    document.getElementById('adminSetWave').addEventListener('click', () => {
        const wave = parseInt(document.getElementById('adminWaveNumber').value) || 1;
        if (window.game) {
            window.game.waveIndex = wave - 1;
            window.game.wave = wave;
            window.game.updateUI();
        }
    });

    document.getElementById('adminStartWave').addEventListener('click', () => {
        if (window.game) window.game.startWave();
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
        }
    });

    document.getElementById('adminSetSpeed').addEventListener('click', () => {
        const speed = parseInt(document.getElementById('adminSpeedValue').value) || 1;
        if (window.game) {
            window.game.timeScale = speed;
            window.game.speedBtn.textContent = `Скорость: ${speed}x`;
        }
    });

    document.getElementById('adminClearAll').addEventListener('click', () => {
        if (window.game && confirm('Удалить все башни и врагов?')) {
            window.game.towers = [];
            window.game.enemies = [];
            window.game.bullets = [];
            if (window.game.map) window.game.map.occupiedCells = new Set();
        }
    });

    panel.style.display = 'none';
}
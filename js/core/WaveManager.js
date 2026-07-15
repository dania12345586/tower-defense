import { WAVES } from '../configs/waveConfig.js';

export class WaveManager {
    constructor(state, enemyManager, uiManager) {
        this.state = state;
        this.enemyManager = enemyManager;
        this.ui = uiManager;
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.currentWaveData = null;
        this.spawnTimer = 0;
        this.spawnDelay = 1.0;
        this.waveGroups = [];
        this.waveGroupIndex = 0;
        this.waveGroupCounter = 0;
    }

    startWave() {
        if (this.waveInProgress) return;
        if (this.state.enemies.some(e => e.isAlive())) return;
        if (this.state.victory) return;
        if (this.state.waveIndex >= WAVES.length) {
            console.log('Все волны пройдены!');
            return;
        }
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.currentWaveData = WAVES[this.state.waveIndex];
        this.enemiesToSpawn = 0;
        this.waveGroups = [];
        for (const g of this.currentWaveData.enemies) {
            let count = g.count;
            if (this.state.selectedMap === 'volcano') count *= 2;
            if (this.state.isMultiplayer && this.state.waveIndex > 3) {
                count = Math.floor(count * 1.2);
            }
            this.enemiesToSpawn += count;
            this.waveGroups.push({ type: g.type, count });
        }
        this.spawnDelay = this.currentWaveData.delay;
        this.spawnTimer = 0;
        this.waveGroupIndex = 0;
        this.waveGroupCounter = 0;
        this.state.currentPathIndex = 0;
        this.ui.updateUI(this.state);
    }

    update(deltaTime) {
        if (!this.waveInProgress) return;
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnDelay && this.enemiesSpawned < this.enemiesToSpawn) {
            const group = this.waveGroups[this.waveGroupIndex];
            this.enemyManager.spawnEnemyFromWave(group, this.state.waveIndex);
            this.enemiesSpawned++;
            this.waveGroupCounter++;
            if (this.waveGroupCounter >= group.count) {
                this.waveGroupIndex++;
                this.waveGroupCounter = 0;
            }
            this.spawnTimer = 0;
        }
        if (this.enemiesSpawned >= this.enemiesToSpawn && this.state.enemies.length === 0) {
            this.endWave();
        }
    }

    endWave() {
        this.waveInProgress = false;
        this.state.waveIndex++;
        this.state.wave++;
        const bonus = 15 + this.state.wave * 3;
        const finalBonus = this.state.isMultiplayer ? Math.floor(bonus * 0.7) : bonus;
        this.state.gold += finalBonus;
        this.state.score += 20;
        this.ui.updateUI(this.state);

        if (this.state.waveIndex >= WAVES.length) {
            this.state.victory = true;
            this.state.gameEnded = true;
            const reward = this.state.coinRewards[this.state.selectedMap] || 0;
            this.state.coins += reward;
            // Очистка комнаты будет в engine.js
            return;
        }
        // Автозапуск следующей волны через 1.5 сек
        setTimeout(() => {
            if (!this.state.gameOver && !this.state.victory && !this.waveInProgress) {
                this.startWave();
            }
        }, 1500);
    }
}
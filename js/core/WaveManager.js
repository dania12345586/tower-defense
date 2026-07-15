// js/core/WaveManager.js
import { WAVES } from '../configs/waveConfig.js';
import { updateGameState } from '../sync.js';

export class WaveManager {
    constructor(state, enemyManager, onUpdateUI, onGameComplete) {
        this.state = state;
        this.enemyManager = enemyManager;
        this.onUpdateUI = onUpdateUI;
        this.onGameComplete = onGameComplete;
        this.isFirstWave = true;
        this.waveTimer = 0;
    }

    startWave() {
        if (this.state.waveInProgress) return;
        if (this.state.enemies.some(e => e.isAlive())) return;
        if (this.state.victory) return;
        if (this.state.waveIndex >= WAVES.length) {
            console.log('Все волны пройдены!');
            return;
        }
        console.log(`🌊 Запуск волны ${this.state.waveIndex + 1}`);
        const waveData = WAVES[this.state.waveIndex];
        this.enemyManager.startWave(waveData, this.state.isMultiplayer);
        this.state.waveInProgress = true;
        this.onUpdateUI();

        if (this.state.syncEnabled && this.state.isHost) {
            updateGameState({
                wave: this.state.wave,
                wave_index: this.state.waveIndex,
                enemies: this.state.enemies.map(e => e.toJSON ? e.toJSON() : e)
            });
        }
    }

    update(deltaTime) {
        if (!this.state.waveInProgress) return;
        this.enemyManager.spawnTimer += deltaTime;
        if (this.enemyManager.spawnTimer >= this.enemyManager.spawnDelay && 
            this.enemyManager.enemiesSpawned < this.enemyManager.enemiesToSpawn) {
            this.enemyManager.spawnEnemy();
            this.enemyManager.enemiesSpawned++;
            this.enemyManager.spawnTimer = 0;
        }
        if (this.enemyManager.isWaveComplete()) {
            this.completeWave();
        }
    }

    completeWave() {
        this.state.waveInProgress = false;
        this.state.waveIndex++;
        this.state.wave++;
        const bonus = 15 + this.state.wave * 3;
        const finalBonus = this.state.isMultiplayer ? Math.floor(bonus * 0.7) : bonus;
        this.state.gold += finalBonus;
        this.state.score += 20;
        this.onUpdateUI();

        console.log(`✅ Волна ${this.state.waveIndex} завершена`);

        if (this.state.waveIndex >= WAVES.length) {
            this.state.victory = true;
            this.onGameComplete('victory');
            return;
        }

        if (this.state.syncEnabled && this.state.isHost) {
            updateGameState({
                wave: this.state.wave,
                wave_index: this.state.waveIndex
            });
        }

        if (this.isFirstWave) this.isFirstWave = false;

        setTimeout(() => {
            if (!this.state.gameOver && !this.state.victory && !this.state.waveInProgress) {
                this.startWave();
            }
        }, 1500);
    }
}
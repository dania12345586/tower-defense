// js/core/EnemyManager.js
import { createEnemy, Megaboss } from '../enemy.js';
import { sendAction } from '../sync.js';

export class EnemyManager {
    constructor(state, map, onUpdateUI) {
        this.state = state;
        this.map = map;
        this.onUpdateUI = onUpdateUI;
        this.spawnTimer = 0;
        this.spawnDelay = 1.0;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.currentWaveData = null;
        this.waveGroups = [];
        this.waveGroupIndex = 0;
        this.waveGroupCounter = 0;
        this.currentPathIndex = 0;
    }

    startWave(waveData, isMultiplayer) {
        this.state.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.currentWaveData = waveData;
        this.enemiesToSpawn = 0;
        this.waveGroups = [];
        for (const g of waveData.enemies) {
            let count = g.count;
            if (this.state.selectedMap === 'volcano') count *= 2;
            if (isMultiplayer && this.state.waveIndex > 3) {
                count = Math.floor(count * 1.2);
            }
            this.enemiesToSpawn += count;
            this.waveGroups.push({ type: g.type, count });
        }
        this.spawnDelay = waveData.delay;
        this.spawnTimer = 0;
        this.waveGroupIndex = 0;
        this.waveGroupCounter = 0;
        this.currentPathIndex = 0;
    }

    spawnEnemy() {
        if (!this.waveGroups || this.waveGroupIndex >= this.waveGroups.length) return null;
        const group = this.waveGroups[this.waveGroupIndex];
        const enemyType = group.type;
        let path;
        if (this.state.selectedMap === 'volcano') {
            path = this.map.paths[this.currentPathIndex % 2];
            this.currentPathIndex++;
        } else {
            path = this.map.paths[0];
        }
        let enemy;
        if (enemyType === 'megaboss') {
            const isVolcano = (this.state.selectedMap === 'volcano');
            enemy = new Megaboss(path, isVolcano);
        } else {
            enemy = createEnemy(path, enemyType);
        }
        if (this.state.isMultiplayer) {
            enemy.hp = Math.floor(enemy.hp * 1.5);
            enemy.maxHp = enemy.hp;
            enemy.speed = Math.floor(enemy.speed * 1.1);
        }
        this.state.enemies.push(enemy);
        this.waveGroupCounter++;
        if (this.waveGroupCounter >= group.count) {
            this.waveGroupIndex++;
            this.waveGroupCounter = 0;
        }
        return enemy;
    }

    updateEnemies(deltaTime, towers) {
        for (let i = this.state.enemies.length - 1; i >= 0; i--) {
            const e = this.state.enemies[i];
            e.update(deltaTime, this.state.enemies, towers);
            if (e.isDead) {
                this.state.gold += e.reward;
                this.state.score += e.reward;
                this.state.enemies.splice(i, 1);
                this.onUpdateUI();
                if (this.state.syncEnabled) {
                    sendAction('kill_enemy', { enemyId: e.id || Math.random(), reward: e.reward });
                }
            } else if (e.reachedEnd) {
                this.state.lives -= e.damageToBase;
                this.state.enemies.splice(i, 1);
                this.onUpdateUI();
                if (this.state.lives <= 0) {
                    this.state.gameOver = true;
                    return true; // game over
                }
            }
        }
        return false;
    }

    isWaveComplete() {
        return this.enemiesSpawned >= this.enemiesToSpawn && this.state.enemies.length === 0;
    }
}
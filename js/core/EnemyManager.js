import { createEnemy, Megaboss } from '../enemy.js';
import { sendAction } from '../sync.js';

export class EnemyManager {
    constructor(state, map, uiManager) {
        this.state = state;
        this.map = map;
        this.ui = uiManager;
        this.enemies = state.enemies;
    }

    spawnEnemyFromWave(group, waveIndex) {
        const enemyType = group.type;
        let path;
        if (this.state.selectedMap === 'volcano') {
            const idx = this.state.currentPathIndex % 2;
            path = this.map.paths[idx];
            this.state.currentPathIndex++;
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
        this.enemies.push(enemy);
        return enemy;
    }

    updateEnemies(deltaTime) {
        const toRemove = [];
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(deltaTime, this.enemies, this.state.towers);
            if (e.isDead) {
                this.state.gold += e.reward;
                this.state.score += e.reward;
                toRemove.push(i);
                this.ui.updateUI(this.state);
            } else if (e.reachedEnd) {
                this.state.lives -= e.damageToBase;
                toRemove.push(i);
                if (this.state.lives <= 0) {
                    this.state.gameOver = true;
                    this.ui.updateUI(this.state);
                }
            }
        }
        for (const idx of toRemove) {
            this.enemies.splice(idx, 1);
        }
        return this.enemies;
    }
}
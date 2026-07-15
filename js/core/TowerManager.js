// js/core/TowerManager.js
import { Tower, FlameTower, DJTower, ElectricTower, LaserTower } from '../towers/index.js';
import { sendAction } from '../sync.js';

export class TowerManager {
    constructor(state, map, onUpdateUI) {
        this.state = state;
        this.map = map;
        this.onUpdateUI = onUpdateUI;
        this.flameCount = 0;
        this.maxFlame = 2;
        this.djCount = 0;
        this.maxDj = 1;
        this.shockerCount = 0;
        this.maxShockers = 3;
        this.pistolCount = 0;
        this.maxPistols = 4;
        this.laserCount = 0;
        this.maxLasers = 2;
    }

    getTowerCost(type) {
        const costs = { pistol: 60, flame: 200, dj: 280, electric: 95, laser: 1000 };
        return costs[type] || 0;
    }

    canBuild(type) {
        const checks = {
            pistol: this.pistolCount < this.maxPistols,
            flame: this.flameCount < this.maxFlame,
            dj: this.djCount < this.maxDj,
            electric: this.shockerCount < this.maxShockers,
            laser: this.laserCount < this.maxLasers
        };
        return checks[type] !== undefined ? checks[type] : false;
    }

    buildTower(type, gridX, gridY) {
        if (!this.canBuild(type)) return null;
        const cost = this.getTowerCost(type);
        if (this.state.gold < cost) return null;
        if (!this.map.canBuildAt(gridX, gridY)) return null;

        const { x, y } = this.map.gridToPixel(gridX, gridY);
        let tower;
        switch (type) {
            case 'pistol':
                tower = new Tower(x, y, 'pistol');
                this.pistolCount++;
                break;
            case 'flame':
                tower = new FlameTower(x, y);
                this.flameCount++;
                break;
            case 'dj':
                tower = new DJTower(x, y);
                this.djCount++;
                break;
            case 'electric':
                tower = new ElectricTower(x, y);
                this.shockerCount++;
                break;
            case 'laser':
                tower = new LaserTower(x, y);
                this.laserCount++;
                break;
        }
        if (!tower) return null;
        tower.gridX = gridX;
        tower.gridY = gridY;
        this.state.towers.push(tower);
        this.map.occupyCell(gridX, gridY);
        this.state.gold -= cost;
        this.onUpdateUI();

        if (this.state.syncEnabled) {
            sendAction('build_tower', { type, x, y, gridX, gridY, level: tower.level, cost });
        }
        return tower;
    }

    upgradeTower(tower) {
        if (!tower) return false;
        if (this.state.gold < tower.upgradeCost) return false;
        if (tower.level >= tower.maxLevel) return false;
        this.state.gold -= tower.upgradeCost;
        tower.upgrade();
        this.onUpdateUI();
        if (this.state.syncEnabled) {
            sendAction('upgrade_tower', { towerId: tower.id || Math.random(), level: tower.level });
        }
        return true;
    }

    sellTower(tower) {
        const index = this.state.towers.indexOf(tower);
        if (index === -1) return false;
        this.state.towers.splice(index, 1);
        if (tower.gridX !== undefined && tower.gridY !== undefined) {
            this.map.occupiedCells.delete(`${tower.gridX},${tower.gridY}`);
        }
        const price = Math.floor(tower.totalCost * 0.15);
        this.state.gold += price;
        this.onUpdateUI();
        if (this.state.syncEnabled) {
            sendAction('sell_tower', { towerId: tower.id || Math.random() });
        }
        return true;
    }

    getTowerAt(x, y) {
        for (const tower of this.state.towers) {
            if (tower.containsPoint(x, y)) {
                return tower;
            }
        }
        return null;
    }
}
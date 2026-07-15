import { Tower, FlameTower, DJTower, ElectricTower, LaserTower, ShotgunTower, SatelliteTower } from '../towers/index.js';
import { sendAction } from '../sync.js';

export class TowerManager {
    constructor(state, map, uiManager) {
        this.state = state;
        this.map = map;
        this.ui = uiManager;
    }

    canBuild(type, extraCounts = {}) {
        const { gold, pistolCount, maxPistols, flameTowerCount, maxFlameTowers,
                djTowerCount, maxDjTowers, shockerCount, maxShockers,
                laserCount, maxLasers } = this.state;
        const cost = this.state.getTowerCost(type);
        if (gold < cost) {
            this.ui.showHint('Недостаточно золота!');
            return false;
        }
        switch(type) {
            case 'pistol':
                if (pistolCount >= maxPistols) {
                    this.ui.showHint('Достигнут лимит пистолетчиков (4)!');
                    return false;
                }
                break;
            case 'flame':
                if (flameTowerCount >= maxFlameTowers) {
                    this.ui.showHint('Достигнут лимит огнемётов (2)!');
                    return false;
                }
                break;
            case 'dj':
                if (djTowerCount >= maxDjTowers) {
                    this.ui.showHint('Достигнут лимит DJ (1)!');
                    return false;
                }
                break;
            case 'electric':
                if (shockerCount >= maxShockers) {
                    this.ui.showHint('Достигнут лимит шокеров (3)!');
                    return false;
                }
                break;
            case 'laser':
                if (laserCount >= maxLasers) {
                    this.ui.showHint('Достигнут лимит лазеров (2)!');
                    return false;
                }
                break;
            // shotgun и satellite проверяются в engine
        }
        return true;
    }

    build(type, tx, ty, gridX, gridY) {
        if (!this.canBuild(type)) return null;
        let tower;
        const cost = this.state.getTowerCost(type);
        if (this.state.gold < cost) {
            this.ui.showHint('Недостаточно золота!');
            return null;
        }
        this.state.gold -= cost;

        switch(type) {
            case 'pistol':
                tower = new Tower(tx, ty, 'pistol');
                this.state.pistolCount++;
                break;
            case 'flame':
                tower = new FlameTower(tx, ty);
                this.state.flameTowerCount++;
                break;
            case 'dj':
                tower = new DJTower(tx, ty);
                this.state.djTowerCount++;
                break;
            case 'electric':
                tower = new ElectricTower(tx, ty);
                this.state.shockerCount++;
                break;
            case 'laser':
                tower = new LaserTower(tx, ty);
                this.state.laserCount++;
                break;
            case 'shotgun':
                tower = new ShotgunTower(tx, ty);
                break;
            case 'satellite':
                tower = new SatelliteTower(tx, ty);
                break;
            default:
                return null;
        }
        tower.gridX = gridX;
        tower.gridY = gridY;
        this.state.towers.push(tower);
        this.map.occupyCell(gridX, gridY);
        this.ui.updateUI(this.state);

        if (this.state.syncEnabled) {
            sendAction('build_tower', { type, x: tx, y: ty, gridX, gridY, level: tower.level, cost });
        }
        return tower;
    }

    upgrade(tower) {
        if (!tower) return false;
        if (this.state.gold < tower.upgradeCost) return false;
        if (tower.level >= tower.maxLevel) return false;
        this.state.gold -= tower.upgradeCost;
        tower.upgrade();
        this.ui.updateUI(this.state);
        if (this.state.syncEnabled) {
            sendAction('upgrade_tower', { towerId: tower.id || Math.random(), level: tower.level });
        }
        return true;
    }

    sell(tower) {
        const index = this.state.towers.indexOf(tower);
        if (index === -1) return false;
        this.state.towers.splice(index, 1);
        if (tower.gridX !== undefined && tower.gridY !== undefined) {
            this.map.occupiedCells.delete(`${tower.gridX},${tower.gridY}`);
        }
        switch(tower.type) {
            case 'pistol': this.state.pistolCount--; break;
            case 'flame': this.state.flameTowerCount--; break;
            case 'dj': this.state.djTowerCount--; break;
            case 'electric': this.state.shockerCount--; break;
            case 'laser': this.state.laserCount--; break;
            // shotgun и satellite уменьшаются в engine
        }
        const price = Math.floor(tower.totalCost * 0.15);
        this.state.gold += price;
        this.ui.updateUI(this.state);
        if (this.state.syncEnabled) {
            sendAction('sell_tower', { towerId: tower.id || Math.random() });
        }
        return true;
    }
}
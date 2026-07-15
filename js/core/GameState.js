// js/core/GameState.js
export class GameState {
    constructor() {
        this.gold = 120;
        this.coins = 0;
        this.lives = 20;
        this.wave = 1;
        this.waveIndex = 0;
        this.score = 0;
        this.gameOver = false;
        this.victory = false;
        this.isPaused = false;
        this.timeScale = 1;
        this.waveInProgress = false;
        this.enemies = [];
        this.towers = [];
        this.bullets = [];
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.isMultiplayer = false;
        this.syncEnabled = false;
        this.myPlayerId = null;
        this.roomId = null;
        this.isHost = false;
    }

    reset() {
        this.gold = 120;
        this.coins = 0;
        this.lives = 20;
        this.wave = 1;
        this.waveIndex = 0;
        this.score = 0;
        this.gameOver = false;
        this.victory = false;
        this.isPaused = false;
        this.timeScale = 1;
        this.waveInProgress = false;
        this.enemies = [];
        this.towers = [];
        this.bullets = [];
        this.selectedTowerType = null;
        this.selectedTower = null;
    }
}
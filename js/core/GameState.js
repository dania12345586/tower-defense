export class GameState {
    constructor() {
        this.gold = 120;
        this.lives = 20;
        this.wave = 1;
        this.waveIndex = 0;
        this.score = 0;
        this.coins = 0;
        this.gameOver = false;
        this.victory = false;
        this.isPaused = false;
        this.timeScale = 1;
        this.isMultiplayer = false;
        this.syncEnabled = false;
        this.myPlayerId = null;
        this.roomId = null;
        this.isHost = false;
        this.selectedMap = 'default';
        this.enemies = [];
        this.towers = [];
        this.bullets = [];
        this.unlockedTowers = ['pistol', 'flame', 'dj'];
        this.selectedTowers = ['pistol', 'flame', 'dj'];
        this.achievements = [];
        this.userId = null;
        this.username = null;
        this.isFirstWave = true;
        this.waveInProgress = false;
        this.currentPathIndex = 0;
        this.coinRewards = {
            'default': 25,
            'forest': 25,
            'lunar': 30,
            'snow': 50,
            'mushroom': 75,
            'volcano': 150
        };
        // Лимиты башен
        this.flameTowerCount = 0;
        this.maxFlameTowers = 2;
        this.djTowerCount = 0;
        this.maxDjTowers = 1;
        this.shockerCount = 0;
        this.maxShockers = 3;
        this.pistolCount = 0;
        this.maxPistols = 4;
        this.laserCount = 0;
        this.maxLasers = 2;
        // Спутник и дробовик – лимиты в engine, но можно добавить сюда
        // Оставим в engine для простоты
        this.players_state = {};
    }

    // Стоимость установки башен
    getTowerCost(type) {
        const costs = {
            pistol: 60,
            flame: 200,
            dj: 280,
            electric: 95,
            laser: 1000,
            shotgun: 250,
            satellite: 400
        };
        return costs[type] || 0;
    }

    // Сброс мультиплеерных флагов
    resetMultiplayer() {
        this.isMultiplayer = false;
        this.syncEnabled = false;
        this.myPlayerId = null;
        this.roomId = null;
        this.isHost = false;
        this.players_state = {};
    }
}
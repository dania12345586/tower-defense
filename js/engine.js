// js/engine.js
import { GameMap } from './map.js';
import { loadProgress, saveProgress, supabase } from './auth.js';
import { getSelectedTowers } from './ui/menu.js';
import { getGameState, unsubscribeSync } from './sync.js';
import { GameState } from './core/GameState.js';
import { UIManager } from './core/UIManager.js';
import { TowerManager } from './core/TowerManager.js';
import { EnemyManager } from './core/EnemyManager.js';
import { WaveManager } from './core/WaveManager.js';
import { DJTower } from './towers/index.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new GameState();
        this.ui = new UIManager(this.state);
        this.map = null;
        this.towerManager = null;
        this.enemyManager = null;
        this.waveManager = null;
        this.selectedTowers = [];
        this.selectedMap = 'default';
        this.userId = null;
        this.username = null;
        this.unlockedTowers = ['pistol', 'flame', 'dj'];
        this.achievements = [];
        this.coinRewards = {
            'default': 25, 'forest': 25, 'lunar': 30,
            'snow': 50, 'mushroom': 75, 'volcano': 150
        };
        this.hoveredCell = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.menuButtonCreated = false;
        this.sounds = {};
        this.music = {};
        this.currentMusic = null;
        this.toggleAdminBtn = document.getElementById('toggleAdminPanel');
        this.loadSounds();
        this.loadMusic();
        this.init();
    }

    loadSounds() {
        const files = {
            shootPistol: { path: 'sounds/shoot_pistol.mp3', volume: 0.15 },
            shootFlame: { path: 'sounds/shoot_flame.mp3', volume: 0.4 },
            shootElectric: { path: 'sounds/shoot_electric.mp3', volume: 0.15 },
            shootDj: { path: 'sounds/shoot_dj.mp3', volume: 0.15 },
            shootLaser: { path: 'sounds/shoot_laser.mp3', volume: 0.2 }
        };
        for (const [key, cfg] of Object.entries(files)) {
            try {
                const audio = new Audio(cfg.path);
                audio.volume = cfg.volume;
                audio.load();
                this.sounds[key] = audio;
            } catch { this.sounds[key] = null; }
        }
    }

    playSound(name) {
        try {
            const sound = this.sounds[name];
            if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
        } catch {}
    }

    loadMusic() {
        const types = ['default', 'forest', 'lunar', 'snow', 'mushroom', 'volcano'];
        for (const type of types) {
            try {
                const audio = new Audio(`sounds/music/${type}.mp3`);
                audio.loop = true;
                audio.volume = 0.3;
                audio.load();
                this.music[type] = audio;
            } catch { this.music[type] = null; }
        }
    }

    playMusic(mapType) {
        if (this.currentMusic) { this.currentMusic.pause(); this.currentMusic.currentTime = 0; }
        const track = this.music[mapType];
        if (track) { track.currentTime = 0; track.play().catch(() => {}); this.currentMusic = track; }
        else { this.currentMusic = null; }
    }

    stopMusic() {
        if (this.currentMusic) { this.currentMusic.pause(); this.currentMusic.currentTime = 0; this.currentMusic = null; }
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches) { const t = e.touches[0] || e.changedTouches[0]; clientX = t.clientX; clientY = t.clientY; }
        else { clientX = e.clientX; clientY = e.clientY; }
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    init() {
        this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];
        const playBtn = document.getElementById('mapSelectPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];
                const checked = document.querySelector('input[name="map"]:checked');
                if (checked) this.selectedMap = checked.value;
                document.getElementById('mapSelectMenu').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'flex';
                this.startGame();
            });
        }
        document.getElementById('speedBtn').addEventListener('click', () => {
            this.state.timeScale = this.state.timeScale === 1 ? 2 : this.state.timeScale === 2 ? 3 : 1;
            document.getElementById('speedBtn').textContent = `Скорость: ${this.state.timeScale}x`;
        });
        document.getElementById('startWave').addEventListener('click', () => {
            if (this.waveManager) {
                if (this.waveManager.isFirstWave && !this.currentMusic) {
                    this.playMusic(this.selectedMap);
                }
                this.waveManager.startWave();
                this.waveManager.isFirstWave = false;
                document.getElementById('startWave').style.display = 'none';
            }
        });
        this.canvas.addEventListener('click', (e) => {
            const pos = this.getPointerPos(e);
            this.handleClick(pos.x, pos.y);
        });
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const pos = this.getPointerPos(e);
            this.handleClick(pos.x, pos.y);
        }, { passive: false });
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getPointerPos(e);
            this.hoveredCell = this.map?.pixelToGrid(pos.x, pos.y);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const pos = this.getPointerPos(e);
            this.hoveredCell = this.map?.pixelToGrid(pos.x, pos.y);
        }, { passive: false });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.state.selectedTowerType = null;
                this.clearSelection();
                this.ui.updateShopUI(this.selectedTowers, (type) => this.selectTowerType(type));
            }
        });
    }

    async startGame() {
        this.userId = window._userId;
        this.username = window._username;
        if (this.username === 'данечка') {
            this.toggleAdminBtn.style.display = 'inline-block';
        } else {
            this.toggleAdminBtn.style.display = 'none';
            document.getElementById('adminPanel').style.display = 'none';
            this.toggleAdminBtn.textContent = 'Админ-панель';
        }
        if (this.userId) {
            try {
                const progress = await loadProgress(this.userId);
                if (progress) {
                    this.state.coins = progress.coins || 0;
                    this.unlockedTowers = progress.unlocked_towers || ['pistol', 'flame', 'dj'];
                    this.achievements = progress.achievements || [];
                }
            } catch {}
        }

        this.state.isMultiplayer = window._isMultiplayer || false;
        if (this.state.isMultiplayer) {
            this.state.roomId = window._multiplayerRoomId;
            this.state.myPlayerId = this.userId;
            this.selectedMap = window._multiplayerMap || 'default';
            this.state.isHost = window._isHost || false;
            this.state.syncEnabled = true;
            this.state.gold = 80;
            import('./sync.js').then(({ initSync, getGameState }) => {
                initSync(this.state.roomId, this.state.myPlayerId, this.state.isHost, (newState) => {
                    this.applyGameState(newState);
                });
                if (!this.state.isHost) {
                    getGameState(this.state.roomId).then(state => {
                        if (state) this.applyGameState(state);
                    }).catch(() => {});
                }
            });
        } else {
            this.state.gold = 120;
        }

        this.state.reset();
        this.state.gold = this.state.isMultiplayer ? 80 : 120;
        this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];
        this.map = new GameMap(this.canvas.width, this.canvas.height, 40, this.selectedMap);

        this.towerManager = new TowerManager(this.state, this.map, () => this.ui.update());
        this.enemyManager = new EnemyManager(this.state, this.map, () => this.ui.update());
        this.waveManager = new WaveManager(
            this.state,
            this.enemyManager,
            () => this.ui.update(),
            (result) => this.onGameComplete(result)
        );
        this.waveManager.isFirstWave = true;

        document.getElementById('startWave').style.display = 'inline-block';
        document.getElementById('startWave').disabled = false;
        document.getElementById('startWave').textContent = 'Start Wave';

        this.ui.updateShopUI(this.selectedTowers, (type) => this.selectTowerType(type));
        this.ui.update();
        this.lastTime = performance.now();
        this.gameLoop();
    }

    applyGameState(state) {
        if (!state) return;
        this.state.wave = state.wave || 1;
        this.state.waveIndex = state.wave_index || 0;
        this.selectedMap = state.map || 'default';
    }

    selectTowerType(type) {
        if (!this.selectedTowers.includes(type)) {
            this.ui.shopHint.textContent = 'Эта башня не выбрана в меню!';
            return;
        }
        if (this.state.selectedTowerType === type) {
            this.state.selectedTowerType = null;
        } else {
            const cost = this.towerManager.getTowerCost(type);
            if (this.state.gold < cost) {
                this.ui.shopHint.textContent = 'Недостаточно золота!';
                setTimeout(() => this.ui.updateShopUI(this.selectedTowers, (t) => this.selectTowerType(t)), 1000);
                return;
            }
            this.state.selectedTowerType = type;
        }
        this.clearSelection();
        this.ui.updateShopUI(this.selectedTowers, (t) => this.selectTowerType(t));
    }

    handleClick(x, y) {
        if (this.state.gameOver || this.state.victory) return;
        if (this.state.selectedTowerType) {
            if (!this.selectedTowers.includes(this.state.selectedTowerType)) {
                this.state.selectedTowerType = null;
                this.ui.updateShopUI(this.selectedTowers, (t) => this.selectTowerType(t));
                return;
            }
            const { gridX, gridY } = this.map.pixelToGrid(x, y);
            const tower = this.towerManager.buildTower(this.state.selectedTowerType, gridX, gridY);
            if (!tower) {
                this.ui.shopHint.textContent = 'Нельзя построить здесь!';
            }
            return;
        }
        const clicked = this.towerManager.getTowerAt(x, y);
        if (clicked) {
            this.selectTower(clicked);
        } else {
            this.clearSelection();
        }
    }

    selectTower(tower) {
        if (this.state.selectedTower) this.state.selectedTower.showRange = false;
        this.state.selectedTower = tower;
        tower.showRange = true;
        this.ui.updateTowerPanel(
            tower,
            this.state.gold,
            () => this.towerManager.upgradeTower(tower),
            (t, price) => this.towerManager.sellTower(t)
        );
    }

    clearSelection() {
        if (this.state.selectedTower) {
            this.state.selectedTower.showRange = false;
            this.state.selectedTower = null;
        }
        this.ui.towerPanel.style.display = 'none';
    }

    gameLoop() {
        const now = performance.now();
        this.deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (this.deltaTime > 0.05) this.deltaTime = 0.05;
        if (!this.state.isPaused && !this.state.gameOver && !this.state.victory) {
            this.update(this.deltaTime * this.state.timeScale);
        }
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        if (this.map?.updateSnow) this.map.updateSnow(deltaTime);
        if (this.waveManager) this.waveManager.update(deltaTime);

        const gameOver = this.enemyManager.updateEnemies(deltaTime, this.state.towers);
        if (gameOver) {
            this.state.gameOver = true;
            this.onGameComplete('defeat');
        }

        for (const tower of this.state.towers) {
            if (tower instanceof DJTower) tower.buffTowers(this.state.towers);
            tower.update(this.state.enemies, this.state.bullets, deltaTime);
        }

        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const b = this.state.bullets[i];
            if (b.checkCollisions) b.checkCollisions(this.state.enemies);
            b.update(deltaTime, this.state.enemies);
            if (b.isDead) this.state.bullets.splice(i, 1);
        }

        if (this.state.selectedTower) {
            this.ui.updateTowerPanel(
                this.state.selectedTower,
                this.state.gold,
                () => this.towerManager.upgradeTower(this.state.selectedTower),
                (t, price) => this.towerManager.sellTower(t)
            );
        }
        this.ui.update();
    }

    draw() {
        if (!this.map) return;
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);
        for (const t of this.state.towers) t.draw(this.ctx);
        for (const e of this.state.enemies) e.draw(this.ctx);
        for (const b of this.state.bullets) b.draw(this.ctx);
        this.drawPreview();
        if (this.state.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Score: ' + this.state.score, this.canvas.width/2, this.canvas.height/2 + 30);
            this.stopMusic();
        } else if (this.state.victory) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆 ПОБЕДА!', this.canvas.width/2, this.canvas.height/2 - 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Score: ' + this.state.score, this.canvas.width/2, this.canvas.height/2 + 30);
            this.stopMusic();
        }
    }

    drawPreview() {
        if (!this.state.selectedTowerType || !this.hoveredCell) return;
        const { gridX, gridY } = this.hoveredCell;
        const { x, y } = this.map.gridToPixel(gridX, gridY);
        const canBuild = this.map.canBuildAt(gridX, gridY);
        const cost = this.towerManager.getTowerCost(this.state.selectedTowerType);
        const enoughGold = this.state.gold >= cost;
        let range = 150;
        if (this.state.selectedTowerType === 'pistol') range = 170;
        else if (this.state.selectedTowerType === 'flame') range = 120;
        else if (this.state.selectedTowerType === 'dj') range = 140;
        else if (this.state.selectedTowerType === 'electric') range = 155;
        else if (this.state.selectedTowerType === 'laser') range = 220;
        this.ctx.fillStyle = canBuild && enoughGold ? 'rgba(0,255,0,0.15)' : 'rgba(255,0,0,0.15)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, range, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = canBuild && enoughGold ? 'rgba(68,68,255,0.7)' : 'rgba(255,0,0,0.5)';
        this.ctx.fillRect(x - 15, y - 15, 30, 30);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 15, y - 15, 30, 30);
    }

    onGameComplete(result) {
        this.stopMusic();
        if (result === 'victory') {
            const reward = this.coinRewards[this.selectedMap] || 0;
            this.state.coins += reward;
            this.saveCoins();
        }
        this.showMenuButton();
        if (this.state.isMultiplayer) this.cleanupMultiplayerRoom();
    }

    async cleanupMultiplayerRoom() {
        if (!this.state.isMultiplayer || !this.state.roomId) return;
        try {
            await supabase.from('rooms').delete().eq('id', this.state.roomId);
            await supabase.from('room_votes').delete().eq('room_id', this.state.roomId);
            await supabase.from('game_state').delete().eq('room_id', this.state.roomId);
            unsubscribeSync();
        } catch {}
    }

    async saveCoins() {
        if (!this.userId) return;
        try {
            await saveProgress(this.userId, {
                coins: this.state.coins,
                unlocked_towers: this.unlockedTowers,
                achievements: this.achievements
            });
        } catch {}
    }

    showMenuButton() {
        if (this.menuButtonCreated) return;
        this.menuButtonCreated = true;
        const btn = document.createElement('button');
        btn.id = 'menuBtn';
        btn.textContent = 'В меню';
        btn.className = 'btn big-btn';
        btn.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;padding:20px 40px;font-size:24px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:12px;color:#fff;cursor:pointer;box-shadow:0 0 40px rgba(102,126,234,0.6);';
        btn.addEventListener('click', async () => {
            this.stopMusic();
            await this.saveCoins();
            location.reload();
        });
        document.body.appendChild(btn);
    }
}

window.addEventListener('load', () => {
    // Игра создаётся в main.js
});
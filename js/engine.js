import { GameMap } from './map.js';
import { GameState } from './core/GameState.js';
import { TowerManager } from './core/TowerManager.js';
import { EnemyManager } from './core/EnemyManager.js';
import { WaveManager } from './core/WaveManager.js';
import { UIManager } from './core/UIManager.js';
import { getSelectedTowers } from './ui/menu.js';
import { loadProgress, saveProgress, supabase } from './auth.js';
import { initSync, sendAction, updateGameState, unsubscribeSync, getGameState } from './sync.js';
import { updateTowerPanel } from './ui/towerPanel.js';
import { Bullet, FlameBullet, SoundWaveBullet } from './towers/Bullet.js';
import { DJTower } from './towers/DJTower.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.map = null;
        this.state = new GameState();
        this.ui = new UIManager();
        this.towerManager = null;
        this.enemyManager = null;
        this.waveManager = null;

        this.selectedTowerType = null;
        this.hoveredCell = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.menuButtonCreated = false;
        this.isFirstWave = true;
        this.selectedTower = null;

        this.sounds = {};
        this.music = {};
        this.currentMusic = null;

        this.towerPanel = document.getElementById('towerPanel');
        this.towerInfo = document.getElementById('towerInfo');
        this.towerLevel = document.getElementById('towerLevel');
        this.upgradeBtn = document.getElementById('upgradeBtn');
        this.sellBtn = document.getElementById('sellBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.startWaveBtn = document.getElementById('startWave');
        this.toggleAdminBtn = document.getElementById('toggleAdminPanel');

        this.loadSounds();
        this.loadMusic();
        this.init();
    }

    loadSounds() {
        const soundFiles = {
            shootPistol: { path: 'sounds/shoot_pistol.mp3', volume: 0.15 },
            shootFlame: { path: 'sounds/shoot_flame.mp3', volume: 0.4 },
            shootElectric: { path: 'sounds/shoot_electric.mp3', volume: 0.15 },
            shootDj: { path: 'sounds/shoot_dj.mp3', volume: 0.15 },
            shootLaser: { path: 'sounds/shoot_laser.mp3', volume: 0.2 }
        };
        for (const [key, config] of Object.entries(soundFiles)) {
            try {
                const audio = new Audio(config.path);
                audio.volume = config.volume;
                audio.load();
                this.sounds[key] = audio;
            } catch (e) {
                this.sounds[key] = null;
            }
        }
    }

    playSound(name) {
        try {
            const sound = this.sounds[name];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(() => {});
            }
        } catch (e) {}
    }

    loadMusic() {
        const mapTypes = ['default', 'forest', 'lunar', 'snow', 'mushroom', 'volcano'];
        for (const type of mapTypes) {
            try {
                const audio = new Audio(`sounds/music/${type}.mp3`);
                audio.loop = true;
                audio.volume = 0.3;
                audio.load();
                this.music[type] = audio;
            } catch (e) {
                this.music[type] = null;
            }
        }
    }

    playMusic(mapType) {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        const track = this.music[mapType];
        if (track) {
            track.currentTime = 0;
            track.play().catch(() => {});
            this.currentMusic = track;
        } else {
            this.currentMusic = null;
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches) {
            const touch = e.touches[0] || e.changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    init() {
        this.state.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];

        const playBtn = document.getElementById('mapSelectPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.state.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];
                const checkedMap = document.querySelector('input[name="map"]:checked');
                if (checkedMap) this.state.selectedMap = checkedMap.value;
                document.getElementById('mapSelectMenu').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'flex';
                this.startGame();
            });
        }

        this.speedBtn.addEventListener('click', () => {
            if (this.state.timeScale === 1) this.state.timeScale = 2;
            else if (this.state.timeScale === 2) this.state.timeScale = 3;
            else this.state.timeScale = 1;
            this.speedBtn.textContent = `Скорость: ${this.state.timeScale}x`;
        });

        this.startWaveBtn.addEventListener('click', () => {
            if (this.isFirstWave && !this.currentMusic) {
                this.playMusic(this.state.selectedMap);
            }
            this.waveManager?.startWave();
            this.startWaveBtn.style.display = 'none';
            this.isFirstWave = false;
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
            this.handleMouseMove(pos.x, pos.y);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const pos = this.getPointerPos(e);
            this.handleMouseMove(pos.x, pos.y);
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.selectedTowerType = null;
                this.clearSelection();
                this.ui.renderShop(this.state);
            }
        });

        // Динамические обработчики для товаров в магазине
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.shop-item');
            if (item && this.ui.shopItems) {
                const type = item.dataset.tower;
                this.selectTowerType(type);
            }
        });

        this.ui.renderShop(this.state);
    }

    async startGame() {
        this.state.userId = window._userId;
        this.state.username = window._username;

        if (this.state.username === 'данечка') {
            this.toggleAdminBtn.style.display = 'inline-block';
        } else {
            this.toggleAdminBtn.style.display = 'none';
            document.getElementById('adminPanel').style.display = 'none';
        }

        if (this.state.userId) {
            try {
                const progress = await loadProgress(this.state.userId);
                if (progress) {
                    this.state.coins = progress.coins || 0;
                    this.state.unlockedTowers = progress.unlocked_towers || ['pistol', 'flame', 'dj'];
                    this.state.achievements = progress.achievements || [];
                }
            } catch (e) {
                console.warn('Ошибка загрузки прогресса:', e);
            }
        }

        // Мультиплеер
        this.state.isMultiplayer = window._isMultiplayer || false;
        if (this.state.isMultiplayer) {
            this.state.roomId = window._multiplayerRoomId;
            this.state.myPlayerId = this.state.userId;
            this.state.selectedMap = window._multiplayerMap || 'default';
            this.state.isHost = window._isHost || false;
            this.state.syncEnabled = true;
            this.state.gold = 80;

            initSync(this.state.roomId, this.state.myPlayerId, this.state.isHost, (newState) => {
                this.applyGameState(newState);
            });

            if (!this.state.isHost) {
                try {
                    const state = await getGameState(this.state.roomId);
                    if (state) this.applyGameState(state);
                } catch (e) {
                    console.warn('Не удалось загрузить состояние:', e);
                }
            }
        } else {
            this.state.gold = 120;
        }

        this.state.waveIndex = 0;
        this.state.wave = 1;
        this.state.lives = 20;
        this.state.score = 0;
        this.state.gameOver = false;
        this.state.victory = false;
        this.isFirstWave = true;
        this.menuButtonCreated = false;
        this.state.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj'];

        this.map = new GameMap(this.canvas.width, this.canvas.height, 40, this.state.selectedMap);
        this.state.towers = [];
        this.state.enemies = [];
        this.state.bullets = [];
        this.state.flameTowerCount = 0;
        this.state.djTowerCount = 0;
        this.state.shockerCount = 0;
        this.state.pistolCount = 0;
        this.state.laserCount = 0;

        this.towerManager = new TowerManager(this.state, this.map, this.ui);
        this.enemyManager = new EnemyManager(this.state, this.map, this.ui);
        this.waveManager = new WaveManager(this.state, this.enemyManager, this.ui);

        this.startWaveBtn.style.display = 'inline-block';
        this.startWaveBtn.disabled = false;
        this.startWaveBtn.textContent = 'Start Wave';

        this.ui.renderShop(this.state);
        this.ui.updateUI(this.state);
        this.lastTime = performance.now();
        this.gameLoop();
    }

    applyGameState(state) {
        if (!state) return;
        this.state.wave = state.wave || 1;
        this.state.waveIndex = state.wave_index || 0;
        this.state.selectedMap = state.map || 'default';
    }

    handleAction(action) {
        console.log('⚡ Действие от другого игрока:', action);
        // Здесь будет обработка действий (постройка, апгрейд и т.д.) в будущем
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
        if (this.map && typeof this.map.updateSnow === 'function') {
            this.map.updateSnow(deltaTime);
        }

        this.waveManager.update(deltaTime);
        this.enemyManager.updateEnemies(deltaTime);

        for (const tower of this.state.towers) {
            if (tower instanceof DJTower) {
                tower.buffTowers(this.state.towers);
            }
            tower.update(this.state.enemies, this.state.bullets, deltaTime);
        }

        for (let i = this.state.bullets.length - 1; i >= 0; i--) {
            const b = this.state.bullets[i];
            if (b instanceof FlameBullet || b instanceof SoundWaveBullet) {
                b.checkCollisions(this.state.enemies);
            }
            b.update(deltaTime, this.state.enemies);
            if (b.isDead) {
                this.state.bullets.splice(i, 1);
            }
        }

        if (this.selectedTower) this.updateTowerPanel();
        this.ui.updateUI(this.state);
    }

    draw() {
        if (!this.map) return;
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        for (const t of this.state.towers) t.draw(this.ctx);
        for (const e of this.state.enemies) e.draw(this.ctx);
        for (const b of this.state.bullets) b.draw(this.ctx);

        if (this.selectedTowerType && this.hoveredCell) {
            const { gridX, gridY } = this.hoveredCell;
            const { x, y } = this.map.gridToPixel(gridX, gridY);
            const canBuild = this.map.canBuildAt(gridX, gridY);
            const cost = this.state.getTowerCost(this.selectedTowerType);
            const enoughGold = this.state.gold >= cost;
            let previewRange = 150;
            if (this.selectedTowerType === 'pistol') previewRange = 170;
            else if (this.selectedTowerType === 'flame') previewRange = 120;
            else if (this.selectedTowerType === 'dj') previewRange = 140;
            else if (this.selectedTowerType === 'electric') previewRange = 155;
            else if (this.selectedTowerType === 'laser') previewRange = 220;

            this.ctx.fillStyle = canBuild && enoughGold ? 'rgba(0,255,0,0.15)' : 'rgba(255,0,0,0.15)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, previewRange, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = canBuild && enoughGold ? 'rgba(68,68,255,0.7)' : 'rgba(255,0,0,0.5)';
            this.ctx.fillRect(x - 15, y - 15, 30, 30);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 15, y - 15, 30, 30);
        }

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
            this.cleanupMultiplayerRoom();
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
            this.cleanupMultiplayerRoom();
        }
    }

    // ---- Обработчики взаимодействия ----

    handleClick(x, y) {
        if (this.state.gameOver || this.state.victory) return;

        if (this.selectedTowerType) {
            if (!this.state.selectedTowers.includes(this.selectedTowerType)) {
                this.selectedTowerType = null;
                this.ui.renderShop(this.state);
                return;
            }
            const { gridX, gridY } = this.map.pixelToGrid(x, y);
            if (this.map.canBuildAt(gridX, gridY)) {
                const cost = this.state.getTowerCost(this.selectedTowerType);
                if (this.state.gold >= cost) {
                    const { x: tx, y: ty } = this.map.gridToPixel(gridX, gridY);
                    const tower = this.towerManager.build(this.selectedTowerType, tx, ty, gridX, gridY);
                    if (tower) {
                        this.state.gold -= cost;
                        this.ui.updateUI(this.state);
                    }
                } else {
                    this.ui.showHint('Недостаточно золота!');
                }
            }
            return;
        }

        let clickedTower = null;
        for (const tower of this.state.towers) {
            if (tower.containsPoint(x, y)) {
                clickedTower = tower;
                break;
            }
        }
        if (clickedTower) {
            this.selectTower(clickedTower);
        } else {
            this.clearSelection();
        }
    }

    handleMouseMove(x, y) {
        this.hoveredCell = this.map.pixelToGrid(x, y);
    }

    selectTowerType(type) {
        if (!this.state.selectedTowers.includes(type)) {
            this.ui.showHint('Эта башня не выбрана в меню!');
            return;
        }
        if (this.selectedTowerType === type) {
            this.selectedTowerType = null;
        } else {
            const cost = this.state.getTowerCost(type);
            if (this.state.gold < cost) {
                this.ui.showHint('Недостаточно золота!');
                setTimeout(() => this.ui.renderShop(this.state), 1000);
                return;
            }
            this.selectedTowerType = type;
        }
        this.clearSelection();
        this.ui.renderShop(this.state);
    }

    selectTower(tower) {
        if (this.selectedTower) this.selectedTower.showRange = false;
        this.selectedTower = tower;
        tower.showRange = true;
        this.towerPanel.style.display = 'block';
        this.updateTowerPanel();
    }

    clearSelection() {
        if (this.selectedTower) {
            this.selectedTower.showRange = false;
            this.selectedTower = null;
        }
        this.towerPanel.style.display = 'none';
    }

    updateTowerPanel() {
        updateTowerPanel(
            this.selectedTower,
            this.state.gold,
            () => this.towerManager.upgrade(this.selectedTower),
            (tower, price) => {
                this.towerManager.sell(tower);
                this.clearSelection();
                this.ui.updateUI(this.state);
            }
        );
    }

    // ---- Очистка мультиплеерной комнаты ----

    async cleanupMultiplayerRoom() {
        if (!this.state.isMultiplayer || !this.state.roomId) return;
        try {
            await supabase
                .from('rooms')
                .delete()
                .eq('id', this.state.roomId);
            await supabase
                .from('room_votes')
                .delete()
                .eq('room_id', this.state.roomId);
            await supabase
                .from('game_state')
                .delete()
                .eq('room_id', this.state.roomId);
            unsubscribeSync();
        } catch (e) {
            console.warn('Ошибка очистки мультиплеерной комнаты:', e);
        }
    }

    // ---- Сохранение монет и кнопка "В меню" ----

    async saveCoins() {
        if (!this.state.userId) {
            console.warn('Нет userId, сохранение невозможно');
            return;
        }
        try {
            await saveProgress(this.state.userId, {
                coins: this.state.coins,
                unlocked_towers: this.state.unlockedTowers,
                achievements: this.state.achievements
            });
        } catch (e) {
            console.warn('Не удалось сохранить монеты:', e);
        }
    }

    showMenuButton() {
        if (this.menuButtonCreated) return;
        this.menuButtonCreated = true;

        const menuBtn = document.createElement('button');
        menuBtn.id = 'menuBtn';
        menuBtn.textContent = 'В меню';
        menuBtn.className = 'btn big-btn';
        menuBtn.style.position = 'fixed';
        menuBtn.style.top = '50%';
        menuBtn.style.left = '50%';
        menuBtn.style.transform = 'translate(-50%, -50%)';
        menuBtn.style.zIndex = '10000';
        menuBtn.style.padding = '20px 40px';
        menuBtn.style.fontSize = '24px';
        menuBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        menuBtn.style.border = 'none';
        menuBtn.style.borderRadius = '12px';
        menuBtn.style.color = '#fff';
        menuBtn.style.cursor = 'pointer';
        menuBtn.style.boxShadow = '0 0 40px rgba(102, 126, 234, 0.6)';
        menuBtn.addEventListener('click', async () => {
            this.stopMusic();
            await this.saveCoins();
            location.reload();
        });
        document.body.appendChild(menuBtn);
    }
}

window.addEventListener('load', () => {
    // Игра создаётся в main.js
});
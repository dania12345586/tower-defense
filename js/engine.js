import { GameMap } from './map.js';
import { Enemy, createEnemy, Megaboss } from './enemy.js';
import { Tower, FlameTower, DJTower, ElectricTower, Bullet, FlameBullet, SoundWaveBullet } from './towers/index.js';
import { WAVES } from './configs/waveConfig.js';
import { TOWER_TYPES } from './configs/towerConfig.js';
import { getSelectedTowers } from './ui/menu.js';
import { updateTowerPanel } from './ui/towerPanel.js';
import { loadProgress, saveProgress } from './auth.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.map = null;
        this.enemies = [];
        this.towers = [];
        this.bullets = [];

        this.gold = 120;
        this.coins = 0;
        this.lives = 20;
        this.waveIndex = 0;
        this.wave = 1;
        this.score = 0;
        this.gameOver = false;
        this.victory = false;
        this.isPaused = false;
        this.timeScale = 1;

        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.currentWaveData = null;
        this.spawnTimer = 0;
        this.spawnDelay = 1.0;

        this.selectedTowerType = null;
        this.hoveredCell = null;

        this.lastTime = 0;
        this.deltaTime = 0;

        this.selectedTowers = [];
        this.selectedMap = 'default';
        this.flameTowerCount = 0;
        this.maxFlameTowers = 2;
        this.djTowerCount = 0;
        this.maxDjTowers = 1;
        this.shockerCount = 0;
        this.maxShockers = 3;
        this.pistolCount = 0;
        this.maxPistols = 4;

        this.currentPathIndex = 0;
        this.gameEnded = false;
        this.isFirstWave = true;
        this.menuButtonCreated = false;

        this.unlockedTowers = ['pistol', 'flame', 'dj', 'electric'];
        this.achievements = [];
        this.userId = null;
        this.username = null;

        this.coinRewards = {
            'default': 25,
            'forest': 25,
            'lunar': 30,
            'snow': 50,
            'mushroom': 75,
            'volcano': 150
        };

        this.goldEl = document.getElementById('gold');
        this.livesEl = document.getElementById('lives');
        this.waveEl = document.getElementById('wave');
        this.coinsDisplayEl = document.getElementById('coinsDisplay');
        this.speedBtn = document.getElementById('speedBtn');
        this.towerPanel = document.getElementById('towerPanel');
        this.towerInfo = document.getElementById('towerInfo');
        this.towerLevel = document.getElementById('towerLevel');
        this.upgradeBtn = document.getElementById('upgradeBtn');
        this.shopItems = document.getElementById('shopItems');
        this.shopHint = document.getElementById('shopHint');
        this.startWaveBtn = document.getElementById('startWave');
        this.toggleAdminBtn = document.getElementById('toggleAdminPanel');

        this.selectedTower = null;

        this.sounds = {};
        this.loadSounds();

        this.music = {};
        this.currentMusic = null;
        this.loadMusic();

        this.init();
    }

    loadSounds() {
        const soundFiles = {
            shootPistol: { path: 'sounds/shoot_pistol.mp3', volume: 0.15 },
            shootFlame: { path: 'sounds/shoot_flame.mp3', volume: 0.4 },
            shootElectric: { path: 'sounds/shoot_electric.mp3', volume: 0.15 },
            shootDj: { path: 'sounds/shoot_dj.mp3', volume: 0.15 }
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
        this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj', 'electric'];

        const playBtn = document.getElementById('mapSelectPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj', 'electric'];
                const checkedMap = document.querySelector('input[name="map"]:checked');
                if (checkedMap) this.selectedMap = checkedMap.value;
                document.getElementById('mapSelectMenu').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'flex';
                this.startGame();
            });
        } else {
            console.error('Кнопка "Играть!" (mapSelectPlayBtn) не найдена!');
        }

        this.speedBtn.addEventListener('click', () => {
            if (this.timeScale === 1) this.timeScale = 2;
            else if (this.timeScale === 2) this.timeScale = 3;
            else this.timeScale = 1;
            this.speedBtn.textContent = `Скорость: ${this.timeScale}x`;
        });

        if (this.startWaveBtn) {
            this.startWaveBtn.addEventListener('click', () => {
                if (this.isFirstWave && !this.currentMusic) {
                    this.playMusic(this.selectedMap);
                }
                this.startWave();
                this.startWaveBtn.style.display = 'none';
                this.isFirstWave = false;
            });
        }

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
                this.updateShopUI();
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
                    this.coins = progress.coins || 0;
                    this.unlockedTowers = progress.unlocked_towers || ['pistol', 'flame', 'dj', 'electric'];
                    this.achievements = progress.achievements || [];
                    console.log('Загружены монеты:', this.coins);
                }
            } catch (e) {
                console.warn('Не удалось загрузить монеты:', e);
            }
        }

        this.gold = 120;
        this.waveIndex = 0;
        this.wave = 1;
        this.lives = 20;
        this.score = 0;
        this.gameOver = false;
        this.victory = false;
        this.isFirstWave = true;
        this.menuButtonCreated = false;

        this.selectedTowers = getSelectedTowers() || ['pistol', 'flame', 'dj', 'electric'];

        this.map = new GameMap(this.canvas.width, this.canvas.height, 40, this.selectedMap);
        this.flameTowerCount = 0;
        this.djTowerCount = 0;
        this.shockerCount = 0;
        this.pistolCount = 0;
        this.currentPathIndex = 0;
        this.gameEnded = false;
        this.waveInProgress = false;
        this.enemies = [];
        this.towers = [];
        this.bullets = [];

        if (this.startWaveBtn) {
            this.startWaveBtn.style.display = 'inline-block';
            this.startWaveBtn.disabled = false;
            this.startWaveBtn.textContent = 'Start Wave';
        }

        this.updateShopUI();
        this.updateUI();
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        const now = performance.now();
        this.deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (this.deltaTime > 0.05) this.deltaTime = 0.05;

        if (!this.isPaused && !this.gameOver && !this.victory) {
            this.update(this.deltaTime * this.timeScale);
        }
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        if (this.map && typeof this.map.updateSnow === 'function') {
            this.map.updateSnow(deltaTime);
        }

        if (this.waveInProgress) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnDelay && this.enemiesSpawned < this.enemiesToSpawn) {
                this.spawnEnemy();
                this.enemiesSpawned++;
                this.spawnTimer = 0;
            }
            if (this.enemiesSpawned >= this.enemiesToSpawn && this.enemies.length === 0) {
                this.endWave();
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(deltaTime, this.enemies, this.towers);
            if (e.isDead) {
                this.gold += e.reward;
                this.score += e.reward;
                this.enemies.splice(i, 1);
                this.updateUI();
            } else if (e.reachedEnd) {
                this.lives -= e.damageToBase;
                this.enemies.splice(i, 1);
                if (this.lives <= 0) {
                    this.gameOver = true;
                    this.gameEnded = true;
                    this.stopMusic();
                    this.showMenuButton();
                }
                this.updateUI();
            }
        }

        for (const tower of this.towers) {
            if (tower instanceof DJTower) {
                tower.buffTowers(this.towers);
            }
        }

        for (const tower of this.towers) {
            tower.update(this.enemies, this.bullets, deltaTime);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b instanceof FlameBullet || b instanceof SoundWaveBullet) {
                b.checkCollisions(this.enemies);
            }
            b.update(deltaTime, this.enemies);
            if (b.isDead) {
                this.bullets.splice(i, 1);
            }
        }

        if (this.selectedTower) this.updateTowerPanel();
        this.updateUI();
    }

    draw() {
        if (!this.map) return;
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        for (const t of this.towers) t.draw(this.ctx);
        for (const e of this.enemies) e.draw(this.ctx);
        for (const b of this.bullets) b.draw(this.ctx);

        if (this.selectedTowerType && this.hoveredCell) {
            const { gridX, gridY } = this.hoveredCell;
            const { x, y } = this.map.gridToPixel(gridX, gridY);
            const canBuild = this.map.canBuildAt(gridX, gridY);
            const cost = this.getTowerCost(this.selectedTowerType);
            const enoughGold = this.gold >= cost;
            let previewRange = 150;
            if (this.selectedTowerType === 'pistol') previewRange = 170;
            else if (this.selectedTowerType === 'flame') previewRange = 120;
            else if (this.selectedTowerType === 'dj') previewRange = 140;
            else if (this.selectedTowerType === 'electric') previewRange = 155;

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

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Score: ' + this.score, this.canvas.width/2, this.canvas.height/2 + 30);
            this.stopMusic();
        } else if (this.victory) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆 ПОБЕДА!', this.canvas.width/2, this.canvas.height/2 - 30);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Score: ' + this.score, this.canvas.width/2, this.canvas.height/2 + 30);
            this.stopMusic();
        }
    }

    getTowerCost(type) {
        if (type === 'pistol') return 60;
        if (type === 'flame') return 200;
        if (type === 'dj') return 280;
        if (type === 'electric') return 95;
        return 0;
    }

    updateUI() {
        this.goldEl.textContent = `💰 Gold: ${this.gold}`;
        this.livesEl.textContent = `❤️ Lives: ${this.lives}`;
        this.waveEl.textContent = `🌊 Wave: ${this.wave}`;
        if (this.coinsDisplayEl) this.coinsDisplayEl.textContent = this.coins;

        if (this.startWaveBtn) {
            if (this.isFirstWave && !this.waveInProgress && !this.gameOver && !this.victory) {
                this.startWaveBtn.style.display = 'inline-block';
                this.startWaveBtn.disabled = false;
            } else {
                this.startWaveBtn.style.display = 'none';
            }
        }
    }

    // ===== ИСПРАВЛЕННЫЙ МЕТОД =====
    updateShopUI() {
        this.shopItems.innerHTML = '';
        const configs = {
            pistol: { label: '🔫 Пистолетчик', cost: 60 },
            flame: { label: '🔥 Огнемёт', cost: 200 },
            dj: { label: '🎧 DJ', cost: 280 },
            electric: { label: '⚡ Электрошокер', cost: 95 }
        };
        // Показываем только те башни, которые выбраны в меню
        for (const type of this.selectedTowers) {
            const cfg = configs[type];
            if (!cfg) continue;
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.dataset.tower = type;
            el.innerHTML = `<span>${cfg.label}</span><small>${cfg.cost}💰</small>`;
            el.addEventListener('click', () => this.selectTowerType(type));
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.selectTowerType(type);
            }, { passive: false });
            this.shopItems.appendChild(el);
        }
        this.shopHint.textContent = this.selectedTowerType ? `Выбрано: ${this.selectedTowerType}` : 'Кликните по иконке для выбора';
    }

    // ===== ИСПРАВЛЕННЫЙ МЕТОД =====
    selectTowerType(type) {
        // Проверяем, что башня выбрана в меню
        if (!this.selectedTowers.includes(type)) {
            this.shopHint.textContent = 'Эта башня не выбрана в меню!';
            return;
        }
        if (this.selectedTowerType === type) {
            this.selectedTowerType = null;
        } else {
            const cost = this.getTowerCost(type);
            if (this.gold < cost) {
                this.shopHint.textContent = 'Недостаточно золота!';
                setTimeout(() => this.updateShopUI(), 1000);
                return;
            }
            this.selectedTowerType = type;
        }
        this.clearSelection();
        this.updateShopUI();
    }

    handleClick(x, y) {
        if (this.gameOver || this.victory) return;

        if (this.selectedTowerType) {
            // Дополнительная проверка – если тип не выбран в меню, сбросить
            if (!this.selectedTowers.includes(this.selectedTowerType)) {
                this.selectedTowerType = null;
                this.updateShopUI();
                return;
            }
            const { gridX, gridY } = this.map.pixelToGrid(x, y);
            if (this.map.canBuildAt(gridX, gridY)) {
                const cost = this.getTowerCost(this.selectedTowerType);
                if (this.gold >= cost) {
                    const { x: tx, y: ty } = this.map.gridToPixel(gridX, gridY);
                    let tower;
                    if (this.selectedTowerType === 'pistol') {
                        if (this.pistolCount >= this.maxPistols) {
                            this.shopHint.textContent = 'Достигнут лимит пистолетчиков (4)!';
                            return;
                        }
                        tower = new Tower(tx, ty, 'pistol');
                        this.pistolCount++;
                    } else if (this.selectedTowerType === 'flame') {
                        if (this.flameTowerCount >= this.maxFlameTowers) {
                            this.shopHint.textContent = 'Достигнут лимит огнемётов (2)!';
                            return;
                        }
                        tower = new FlameTower(tx, ty);
                        this.flameTowerCount++;
                    } else if (this.selectedTowerType === 'dj') {
                        if (this.djTowerCount >= this.maxDjTowers) {
                            this.shopHint.textContent = 'Достигнут лимит DJ (1)!';
                            return;
                        }
                        tower = new DJTower(tx, ty);
                        this.djTowerCount++;
                    } else if (this.selectedTowerType === 'electric') {
                        if (this.shockerCount >= this.maxShockers) {
                            this.shopHint.textContent = 'Достигнут лимит шокеров (3)!';
                            return;
                        }
                        tower = new ElectricTower(tx, ty);
                        this.shockerCount++;
                    }
                    tower.gridX = gridX;
                    tower.gridY = gridY;
                    this.towers.push(tower);
                    this.map.occupyCell(gridX, gridY);
                    this.gold -= cost;
                    this.updateUI();
                } else {
                    this.shopHint.textContent = 'Недостаточно золота!';
                }
            }
            return;
        }

        let clickedTower = null;
        for (const tower of this.towers) {
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
        updateTowerPanel(this.selectedTower, this.gold, () => this.upgradeSelectedTower(), (tower, price) => this.sellTower(tower, price));
    }

    upgradeSelectedTower() {
        if (!this.selectedTower) return;
        if (this.gold < this.selectedTower.upgradeCost) return;
        if (this.selectedTower.level >= this.selectedTower.maxLevel) return;
        this.gold -= this.selectedTower.upgradeCost;
        this.selectedTower.upgrade();
        this.updateTowerPanel();
        this.updateUI();
    }

    sellTower(tower, price) {
        const index = this.towers.indexOf(tower);
        if (index === -1) return;
        this.towers.splice(index, 1);
        if (tower.gridX !== undefined && tower.gridY !== undefined) {
            const key = `${tower.gridX},${tower.gridY}`;
            this.map.occupiedCells.delete(key);
        }
        if (tower.type === 'pistol') this.pistolCount--;
        else if (tower.type === 'flame') this.flameTowerCount--;
        else if (tower.type === 'dj') this.djTowerCount--;
        else if (tower.type === 'electric') this.shockerCount--;

        this.gold += price;
        if (this.selectedTower === tower) {
            this.clearSelection();
        }
        this.updateUI();
        this.updateShopUI();
    }

    startWave() {
        if (this.waveInProgress) return;
        if (this.enemies.some(e => e.isAlive())) return;
        if (this.victory) return;
        if (this.waveIndex >= WAVES.length) {
            console.log('Попытка запустить волну, но все волны уже пройдены.');
            return;
        }

        console.log(`Запуск волны ${this.waveIndex + 1} из ${WAVES.length}`);

        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.currentWaveData = WAVES[this.waveIndex];
        this.enemiesToSpawn = 0;
        this.waveGroups = [];
        for (const g of this.currentWaveData.enemies) {
            let count = g.count;
            if (this.selectedMap === 'volcano') {
                count *= 2;
            }
            this.enemiesToSpawn += count;
            this.waveGroups.push({ type: g.type, count: count });
        }
        this.spawnDelay = this.currentWaveData.delay;
        this.spawnTimer = 0;
        this.waveGroupIndex = 0;
        this.waveGroupCounter = 0;
        this.currentPathIndex = 0;
        this.updateUI();
    }

    spawnEnemy() {
        if (!this.waveGroups || this.waveGroupIndex >= this.waveGroups.length) return;
        const group = this.waveGroups[this.waveGroupIndex];
        const enemyType = group.type;
        let path;
        if (this.selectedMap === 'volcano') {
            path = this.map.paths[this.currentPathIndex % 2];
            this.currentPathIndex++;
        } else {
            path = this.map.paths[0];
        }
        let enemy;
        if (enemyType === 'megaboss') {
            const isVolcano = (this.selectedMap === 'volcano');
            enemy = new Megaboss(path, isVolcano);
        } else {
            enemy = createEnemy(path, enemyType);
        }
        this.enemies.push(enemy);
        this.waveGroupCounter++;
        if (this.waveGroupCounter >= group.count) {
            this.waveGroupIndex++;
            this.waveGroupCounter = 0;
        }
    }

    async endWave() {
        this.waveInProgress = false;
        this.waveIndex++;
        this.wave++;
        const bonus = 15 + this.wave * 3;
        this.gold += bonus;
        this.score += 20;
        this.updateUI();

        console.log(`Волна ${this.waveIndex} из ${WAVES.length} завершена. Текущая волна: ${this.wave}`);

        if (this.waveIndex >= WAVES.length) {
            console.log('Все волны пройдены! Победа!');
            this.victory = true;
            this.gameEnded = true;
            this.stopMusic();

            const reward = this.coinRewards[this.selectedMap] || 0;
            this.coins += reward;
            console.log(`Начислено монет: ${reward} за карту ${this.selectedMap}`);

            await this.saveCoins();

            this.showMenuButton();
            this.updateUI();
            return;
        }

        if (this.isFirstWave) {
            this.isFirstWave = false;
        }

        setTimeout(() => {
            if (!this.gameOver && !this.victory && !this.waveInProgress) {
                this.startWave();
            }
        }, 1500);
    }

    async saveCoins() {
        if (!this.userId) {
            console.warn('Нет userId, сохранение невозможно');
            return;
        }
        try {
            await saveProgress(this.userId, {
                coins: this.coins,
                unlocked_towers: this.unlockedTowers,
                achievements: this.achievements
            });
            console.log('Монеты сохранены:', this.coins);
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
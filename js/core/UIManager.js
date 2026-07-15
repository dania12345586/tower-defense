// js/core/UIManager.js
export class UIManager {
    constructor(state) {
        this.state = state;
        this.goldEl = document.getElementById('gold');
        this.livesEl = document.getElementById('lives');
        this.waveEl = document.getElementById('wave');
        this.coinsDisplayEl = document.getElementById('coinsDisplay');
        this.shopItems = document.getElementById('shopItems');
        this.shopHint = document.getElementById('shopHint');
        this.startWaveBtn = document.getElementById('startWave');
        this.towerPanel = document.getElementById('towerPanel');
        this.towerInfo = document.getElementById('towerInfo');
        this.towerLevel = document.getElementById('towerLevel');
        this.upgradeBtn = document.getElementById('upgradeBtn');
    }

    update() {
        this.goldEl.textContent = `💰 Gold: ${this.state.gold}`;
        this.livesEl.textContent = `❤️ Lives: ${this.state.lives}`;
        this.waveEl.textContent = `🌊 Wave: ${this.state.wave}`;
        if (this.coinsDisplayEl) {
            this.coinsDisplayEl.textContent = this.state.coins;
        }
        this.updateStartWaveButton();
    }

    updateStartWaveButton() {
        if (this.startWaveBtn) {
            const isFirstWave = this.state.wave === 1 && !this.state.waveInProgress;
            if (isFirstWave && !this.state.gameOver && !this.state.victory) {
                this.startWaveBtn.style.display = 'inline-block';
                this.startWaveBtn.disabled = false;
            } else {
                this.startWaveBtn.style.display = 'none';
            }
        }
    }

    updateShopUI(selectedTowers, onSelectTower) {
        if (!this.shopItems) return;
        this.shopItems.innerHTML = '';
        const configs = {
            pistol: { label: '🔫 Пистолетчик', cost: 60 },
            flame: { label: '🔥 Огнемёт', cost: 200 },
            dj: { label: '🎧 DJ', cost: 280 },
            electric: { label: '⚡ Электрошокер', cost: 95 },
            laser: { label: '🔴 Лазер', cost: 1000 }
        };
        for (const type of selectedTowers) {
            const cfg = configs[type];
            if (!cfg) continue;
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.dataset.tower = type;
            el.innerHTML = `<span>${cfg.label}</span><small>${cfg.cost}💰</small>`;
            el.addEventListener('click', () => onSelectTower(type));
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                onSelectTower(type);
            }, { passive: false });
            this.shopItems.appendChild(el);
        }
        this.shopHint.textContent = this.state.selectedTowerType ? `Выбрано: ${this.state.selectedTowerType}` : 'Кликните по иконке для выбора';
    }

    updateTowerPanel(tower, gold, onUpgrade, onSell) {
        if (!tower) {
            this.towerPanel.style.display = 'none';
            return;
        }
        this.towerLevel.textContent = `Ур. ${tower.level}`;
        const currentStats = tower.getStats();
        let html = '';
        for (const [key, val] of Object.entries(currentStats)) {
            if (key === 'Уровень' || key === 'Стоимость улучшения') continue;
            html += `<p>${key}: <span>${val}</span></p>`;
        }
        this.towerInfo.innerHTML = html;
        const canUpgrade = tower.level < tower.maxLevel && gold >= tower.upgradeCost;
        this.upgradeBtn.disabled = !canUpgrade;
        this.upgradeBtn.textContent = tower.level >= tower.maxLevel ? 'Макс. уровень' : `Улучшить за ${tower.upgradeCost}💰`;
        this.upgradeBtn.onclick = () => { if (onUpgrade) onUpgrade(); };
        const sellBtn = document.getElementById('sellBtn');
        if (sellBtn) {
            const sellPrice = Math.floor(tower.totalCost * 0.15);
            sellBtn.textContent = `Продать за ${sellPrice}💰`;
            sellBtn.style.display = 'block';
            sellBtn.onclick = () => { if (onSell) onSell(tower, sellPrice); };
        }
        this.towerPanel.style.display = 'block';
    }
}
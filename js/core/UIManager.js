export class UIManager {
    constructor() {
        this.goldEl = document.getElementById('gold');
        this.livesEl = document.getElementById('lives');
        this.waveEl = document.getElementById('wave');
        this.coinsDisplayEl = document.getElementById('coinsDisplay');
        this.shopItems = document.getElementById('shopItems');
        this.shopHint = document.getElementById('shopHint');
        this.startWaveBtn = document.getElementById('startWave');
    }

    updateUI(state) {
        if (this.goldEl) this.goldEl.textContent = `💰 Gold: ${state.gold}`;
        if (this.livesEl) this.livesEl.textContent = `❤️ Lives: ${state.lives}`;
        if (this.waveEl) this.waveEl.textContent = `🌊 Wave: ${state.wave}`;
        if (this.coinsDisplayEl) this.coinsDisplayEl.textContent = state.coins;
        if (this.startWaveBtn) {
            if (state.isFirstWave && !state.waveInProgress && !state.gameOver && !state.victory) {
                this.startWaveBtn.style.display = 'inline-block';
                this.startWaveBtn.disabled = false;
            } else {
                this.startWaveBtn.style.display = 'none';
            }
        }
    }

    showHint(text) {
        if (this.shopHint) this.shopHint.textContent = text;
        setTimeout(() => {
            if (this.shopHint) this.shopHint.textContent = 'Кликните по иконке для выбора';
        }, 2000);
    }

    renderShop(state) {
        if (!this.shopItems) return;
        this.shopItems.innerHTML = '';
        const configs = {
            pistol: { label: '🔫 Пистолетчик', cost: 60 },
            flame: { label: '🔥 Огнемёт', cost: 200 },
            dj: { label: '🎧 DJ', cost: 280 },
            electric: { label: '⚡ Электрошокер', cost: 95 },
            laser: { label: '🔴 Лазер', cost: 1000 }
        };
        for (const type of state.selectedTowers) {
            const cfg = configs[type];
            if (!cfg) continue;
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.dataset.tower = type;
            el.innerHTML = `<span>${cfg.label}</span><small>${cfg.cost}💰</small>`;
            // обработчики клика добавляются в engine
            this.shopItems.appendChild(el);
        }
        this.shopHint.textContent = 'Кликните по иконке для выбора';
    }

    updateTowerPanel(tower, gold, onUpgrade, onSell) {
        // импортируем из ui/towerPanel.js, чтобы не дублировать
        import('../ui/towerPanel.js').then(({ updateTowerPanel }) => {
            updateTowerPanel(tower, gold, onUpgrade, onSell);
        });
    }
}
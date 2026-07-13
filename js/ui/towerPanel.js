export function updateTowerPanel(tower, gold, onUpgrade, onSell) {
    const panel = document.getElementById('towerPanel');
    const levelEl = document.getElementById('towerLevel');
    const infoEl = document.getElementById('towerInfo');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const sellBtn = document.getElementById('sellBtn');

    if (!tower) {
        panel.style.display = 'none';
        return;
    }

    levelEl.textContent = `Ур. ${tower.level}`;

    const currentStats = tower.getStats();
    let nextStats = null;
    if (tower.level < tower.maxLevel) {
        nextStats = tower.getStatsForLevel(tower.level + 1);
    }

    let html = '';
    for (const [key, val] of Object.entries(currentStats)) {
        if (key === 'Уровень' || key === 'Стоимость улучшения') continue;
        let displayVal = val;
        if (nextStats && nextStats[key] !== undefined) {
            const nextVal = nextStats[key];
            if (nextVal !== val) {
                const cleanVal = parseFloat(val);
                const cleanNext = parseFloat(nextVal);
                if (!isNaN(cleanVal) && !isNaN(cleanNext) && cleanNext !== cleanVal) {
                    const diff = cleanNext - cleanVal;
                    const sign = diff > 0 ? '+' : '';
                    displayVal = `${val} → ${nextVal} (${sign}${diff.toFixed(1)})`;
                } else {
                    displayVal = `${val} → ${nextVal}`;
                }
            }
        }
        html += `<p>${key}: <span>${displayVal}</span></p>`;
    }
    infoEl.innerHTML = html;

    const canUpgrade = tower.level < tower.maxLevel && gold >= tower.upgradeCost;
    upgradeBtn.disabled = !canUpgrade;
    upgradeBtn.textContent = tower.level >= tower.maxLevel ? 'Макс. уровень' : `Улучшить за ${tower.upgradeCost}💰`;
    upgradeBtn.onclick = () => {
        if (onUpgrade) onUpgrade();
    };

    // Кнопка продажи
    if (sellBtn) {
        const sellPrice = Math.floor(tower.totalCost * 0.15);
        sellBtn.textContent = `Продать за ${sellPrice}💰`;
        sellBtn.style.display = 'block';
        sellBtn.onclick = () => {
            if (onSell) onSell(tower, sellPrice);
        };
    }

    panel.style.display = 'block';
}
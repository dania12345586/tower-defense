export const TOWER_TYPES = {
    pistol: {
        range: 170,
        damage: 15,
        fireRate: 1.25,   // было 1.0
        cost: 60,
        upgradeCost: 110,
        color: '#4444ff',
        maxLevel: 3,
        burnDamagePerSec: 0,
        label: 'Пистолетчик',
        icon: '🔫',
        desc: 'Высокий урон по одной цели (ранняя игра)'
    },
    flame: {
        range: 120,
        damage: 0,
        fireRate: 0.12,
        cost: 200,
        upgradeCost: 250,
        color: '#ff6600',
        maxLevel: 5,
        burnDamagePerSec: 10,
        burnDuration: 2.5,
        burstCount: 3,
        label: 'Огнемёт',
        icon: '🔥',
        desc: 'Поджигает врагов в области (средняя игра)'
    },
    dj: {
        range: 140,
        damage: 1,
        fireRate: 0.5,
        cost: 280,
        upgradeCost: 220,
        color: '#aa66ff',
        maxLevel: 5,
        burnDamagePerSec: 0,
        burstCount: 2,
        slowFactor: 0.80,
        label: 'DJ',
        icon: '🎧',
        desc: 'Баффает башни, замедляет врагов (поздняя игра)'
    },
    electric: {
        range: 155,
        damage: 12,
        fireRate: 0.75,
        cost: 95,
        upgradeCost: 180,
        color: '#00ccff',
        maxLevel: 4,
        burnDamagePerSec: 0,
        chainRange: 160,
        maxChains: 3,
        bounceDamageMultiplier: 0.5,
        stunChanceBase: 0.03,
        stunChancePerLevel: 0.017,
        stunDuration: 1.2,
        stunImmuneBoss: true,
        label: 'Электрошокер',
        icon: '⚡',
        desc: 'Цепная молния, шанс стана (ранняя-средняя игра)'
    }
};

export const UPGRADE_COST_MULTIPLIER = 1.5;
export const MAX_TOWER_LEVEL = 5;
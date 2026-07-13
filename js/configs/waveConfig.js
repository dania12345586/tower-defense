export const ENEMY_TYPES = {
    normal: { hp: 100, speed: 90, reward: 15, damageToBase: 1, radius: 12, color: '#ff4444' },
    fast: { hp: 75, speed: 180, reward: 20, damageToBase: 1, radius: 10, color: '#ffaa00' },
    armored: { hp: 200, speed: 60, reward: 25, damageToBase: 2, radius: 16, color: '#4488ff' },
    healer: { hp: 80, speed: 70, reward: 30, damageToBase: 1, radius: 14, color: '#44ff88', isHealer: true, healRadius: 100, healAmount: 10 },
    sniper: { hp: 65, speed: 100, reward: 35, damageToBase: 3, radius: 10, color: '#ff44ff', isSniper: true, stunDuration: 3, shootCooldown: 3 },
    tank: { hp: 400, speed: 40, reward: 50, damageToBase: 4, radius: 20, color: '#8844ff' },
    swift: { hp: 65, speed: 240, reward: 25, damageToBase: 2, radius: 9, color: '#ffdd44' },
    giant: { hp: 600, speed: 30, reward: 60, damageToBase: 6, radius: 28, color: '#cc66ff' },
    shielder: { hp: 150, speed: 50, reward: 40, damageToBase: 2, radius: 18, color: '#66ccff', isShielder: true, shieldRadius: 80 },
    assassin: { hp: 55, speed: 300, reward: 40, damageToBase: 5, radius: 8, color: '#ff0066', isAssassin: true },
    mini_boss: { hp: 500, speed: 45, reward: 75, damageToBase: 7, radius: 28, color: '#ff8844' },
    elite_boss: { hp: 1200, speed: 35, reward: 150, damageToBase: 15, radius: 42, color: '#ff00ff' },
    boss: { hp: 800, speed: 50, reward: 100, damageToBase: 10, radius: 36, color: '#aa44ff' },
    berserker: { hp: 120, speed: 80, reward: 30, damageToBase: 2, radius: 14, color: '#ff6633', isBerserker: true, berserkThreshold: 0.4 },
    plague: { hp: 90, speed: 70, reward: 35, damageToBase: 2, radius: 14, color: '#33ff66', isPlague: true, plagueRadius: 60 },
    megaboss: { hp: 8000, speed: 25, reward: 500, damageToBase: 30, radius: 50, color: '#aa44ff' }
};

export const WAVES = [
    // 1-5
    { enemies: [{ type: 'normal', count: 3 }], delay: 1.2 },
    { enemies: [{ type: 'normal', count: 2 }, { type: 'fast', count: 1 }], delay: 1.0 },
    { enemies: [{ type: 'fast', count: 5 }], delay: 1.0 },
    { enemies: [{ type: 'normal', count: 3 }, { type: 'fast', count: 2 }, { type: 'armored', count: 1 }], delay: 1.0 },
    { enemies: [{ type: 'normal', count: 10, hp: 125, speed: 110, reward: 10 }], delay: 1.0 },
    // 6-10
    { enemies: [{ type: 'armored', count: 3, speed: 70 }, { type: 'fast', count: 3, hp: 100, speed: 200 }], delay: 1.0 },
    { enemies: [{ type: 'armored', count: 6, hp: 300 }], delay: 1.0 },
    { enemies: [{ type: 'normal', count: 6, hp: 160, speed: 115, reward: 25 }, { type: 'healer', count: 2, hp: 100, speed: 90, healRadius: 130, healAmount: 35 }], delay: 1.0 },
    { enemies: [{ type: 'fast', count: 20, hp: 100, speed: 300 }], delay: 1.0 },
    { enemies: [{ type: 'tank', count: 1, hp: 800, speed: 60, damageToBase: 10 }, { type: 'healer', count: 3, hp: 110, speed: 50, damageToBase: 10, healRadius: 150, healAmount: 50 }, { type: 'normal', count: 5, hp: 200, speed: 90, damageToBase: 10 }], delay: 1.0 },
    // 11-15
    { enemies: [{ type: 'swift', count: 5, hp: 140 }, { type: 'swift', count: 5, hp: 140 }], delay: 1.0 },
    { enemies: [{ type: 'sniper', count: 2, hp: 200, speed: 20, stunDuration: 3, shootCooldown: 2.5 }, { type: 'fast', count: 6, hp: 200, speed: 200 }], delay: 1.0 },
    { enemies: [{ type: 'assassin', count: 6, hp: 200, speed: 125 }], delay: 1.0 },
    { enemies: [{ type: 'armored', count: 10, hp: 350, speed: 80 }], delay: 1.0 },
    { enemies: [{ type: 'giant', count: 1, hp: 4000, speed: 20 }], delay: 1.0 },
    // 16-20
    { enemies: [{ type: 'normal', count: 8, hp: 150, speed: 100 }, { type: 'fast', count: 5, hp: 120, speed: 220 }], delay: 1.0 },
    { enemies: [{ type: 'armored', count: 6, hp: 400, speed: 70 }, { type: 'healer', count: 2, hp: 120, speed: 60, healAmount: 40 }], delay: 1.0 },
    { enemies: [{ type: 'swift', count: 10, hp: 160 }, { type: 'assassin', count: 4, hp: 250, speed: 130 }], delay: 1.0 },
    { enemies: [{ type: 'tank', count: 2, hp: 900, speed: 55 }, { type: 'normal', count: 8, hp: 180, speed: 110 }], delay: 1.0 },
    { enemies: [{ type: 'shielder', count: 4, hp: 200, speed: 60, shieldRadius: 90 }, { type: 'armored', count: 6, hp: 450, speed: 75 }], delay: 1.0 },
    // 21-25
    { enemies: [{ type: 'berserker', count: 6, hp: 150, speed: 90, berserkThreshold: 0.4 }, { type: 'fast', count: 10, hp: 140, speed: 250 }], delay: 1.0 },
    { enemies: [{ type: 'plague', count: 5, hp: 110, speed: 80, plagueRadius: 70 }, { type: 'normal', count: 12, hp: 200, speed: 105 }], delay: 1.0 },
    { enemies: [{ type: 'sniper', count: 4, hp: 250, speed: 25, stunDuration: 4 }, { type: 'armored', count: 8, hp: 500, speed: 70 }], delay: 1.0 },
    { enemies: [{ type: 'giant', count: 2, hp: 4500, speed: 22 }, { type: 'healer', count: 3, hp: 140, speed: 55, healAmount: 60 }], delay: 1.0 },
    { enemies: [{ type: 'swift', count: 15, hp: 180 }, { type: 'assassin', count: 8, hp: 300, speed: 140 }], delay: 1.0 },
    // 26-30
    { enemies: [{ type: 'tank', count: 3, hp: 1100, speed: 50 }, { type: 'shielder', count: 5, hp: 250, speed: 55, shieldRadius: 100 }], delay: 1.0 },
    { enemies: [{ type: 'berserker', count: 10, hp: 180, speed: 100, berserkThreshold: 0.45 }, { type: 'normal', count: 15, hp: 220, speed: 110 }], delay: 1.0 },
    { enemies: [{ type: 'plague', count: 8, hp: 130, speed: 85, plagueRadius: 80 }, { type: 'fast', count: 12, hp: 160, speed: 260 }], delay: 1.0 },
    { enemies: [{ type: 'mini_boss', count: 2, hp: 800, speed: 50, damageToBase: 12 }, { type: 'armored', count: 10, hp: 550, speed: 65 }], delay: 1.0 },
    { enemies: [{ type: 'sniper', count: 6, hp: 300, speed: 30, stunDuration: 5 }, { type: 'healer', count: 4, hp: 160, speed: 50, healAmount: 70 }], delay: 1.0 },
    // 31-35
    { enemies: [{ type: 'giant', count: 3, hp: 5500, speed: 18 }, { type: 'swift', count: 20, hp: 200, speed: 280 }], delay: 1.0 },
    { enemies: [{ type: 'assassin', count: 12, hp: 350, speed: 150 }, { type: 'berserker', count: 8, hp: 200, speed: 110, berserkThreshold: 0.5 }], delay: 1.0 },
    { enemies: [{ type: 'plague', count: 12, hp: 150, speed: 90, plagueRadius: 90 }, { type: 'tank', count: 4, hp: 1300, speed: 45 }], delay: 1.0 },
    { enemies: [{ type: 'shielder', count: 8, hp: 300, speed: 50, shieldRadius: 110 }, { type: 'armored', count: 12, hp: 600, speed: 60 }], delay: 1.0 },
    { enemies: [{ type: 'normal', count: 20, hp: 250, speed: 120 }, { type: 'healer', count: 5, hp: 180, speed: 50, healAmount: 80 }], delay: 1.0 },
    // 36-40
    { enemies: [{ type: 'mini_boss', count: 3, hp: 1000, speed: 45, damageToBase: 15 }, { type: 'fast', count: 15, hp: 180, speed: 270 }], delay: 1.0 },
    { enemies: [{ type: 'berserker', count: 12, hp: 220, speed: 105, berserkThreshold: 0.5 }, { type: 'plague', count: 10, hp: 160, speed: 85, plagueRadius: 100 }], delay: 1.0 },
    { enemies: [{ type: 'sniper', count: 8, hp: 350, speed: 30, stunDuration: 6 }, { type: 'tank', count: 5, hp: 1500, speed: 40 }], delay: 1.0 },
    { enemies: [{ type: 'giant', count: 4, hp: 6500, speed: 16 }, { type: 'shielder', count: 10, hp: 350, speed: 45, shieldRadius: 120 }], delay: 1.0 },
    { enemies: [{ type: 'assassin', count: 15, hp: 400, speed: 160 }, { type: 'armored', count: 15, hp: 700, speed: 55 }], delay: 1.0 },
    // 41-45
    { enemies: [{ type: 'elite_boss', count: 1, hp: 2500, speed: 30, damageToBase: 20 }, { type: 'normal', count: 25, hp: 300, speed: 130 }], delay: 1.0 },
    { enemies: [{ type: 'plague', count: 15, hp: 180, speed: 90, plagueRadius: 110 }, { type: 'berserker', count: 15, hp: 250, speed: 115, berserkThreshold: 0.5 }], delay: 1.0 },
    { enemies: [{ type: 'mini_boss', count: 4, hp: 1200, speed: 40, damageToBase: 18 }, { type: 'sniper', count: 10, hp: 400, speed: 25, stunDuration: 7 }], delay: 1.0 },
    { enemies: [{ type: 'tank', count: 6, hp: 1800, speed: 35 }, { type: 'healer', count: 6, hp: 200, speed: 45, healAmount: 100 }], delay: 1.0 },
    { enemies: [{ type: 'giant', count: 5, hp: 7500, speed: 14 }, { type: 'swift', count: 25, hp: 220, speed: 300 }], delay: 1.0 },
    // 46-49
    { enemies: [{ type: 'shielder', count: 12, hp: 400, speed: 40, shieldRadius: 130 }, { type: 'armored', count: 20, hp: 800, speed: 50 }], delay: 1.0 },
    { enemies: [{ type: 'assassin', count: 20, hp: 450, speed: 170 }, { type: 'berserker', count: 18, hp: 300, speed: 120, berserkThreshold: 0.6 }], delay: 1.0 },
    { enemies: [{ type: 'elite_boss', count: 2, hp: 3000, speed: 25, damageToBase: 25 }, { type: 'plague', count: 20, hp: 200, speed: 95, plagueRadius: 120 }], delay: 1.0 },
    { enemies: [{ type: 'mini_boss', count: 6, hp: 1500, speed: 35, damageToBase: 20 }, { type: 'normal', count: 30, hp: 350, speed: 140 }], delay: 1.0 },
    // 50-я волна: Мега-босс
    { enemies: [{ type: 'megaboss', count: 1 }], delay: 1.0 }
];
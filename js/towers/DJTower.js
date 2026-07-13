import { Tower } from './BaseTower.js';
import { SoundWaveBullet } from './Bullet.js';

export class DJTower extends Tower {
    constructor(x, y) {
        super(x, y, 'dj');
    }

    buffTowers(towers) {
        const dmgMult = 1.04 + (this.level - 1) * 0.025;
        const frMult = 1.05 + (this.level - 1) * 0.025;
        for (const tower of towers) {
            if (tower === this) continue;
            const dx = tower.x - this.x;
            const dy = tower.y - this.y;
            if (dx*dx + dy*dy <= this.range * this.range) {
                tower.applyBuff(dmgMult, frMult);
            } else {
                tower.resetBuff();
            }
        }
    }

    shoot(bullets) {
        if (!this.target) return;
        this.target.takeDamage(this.damage);
        this.target.applySlow(this.slowFactor);
        const count = this.burstCount || 2;
        const spread = 0.6;
        const baseAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const speed = 500; // увеличена скорость с 350 до 500
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const sw = new SoundWaveBullet(
                this.x, this.y,
                this.target,
                this.damage,
                '#aa88ff',
                7, // радиус увеличен с 5 до 7 для лучшей видимости
                speed,
                angle,
                this.range,
                this.slowFactor,
                this
            );
            bullets.push(sw);
        }
        if (window.game && window.game.playSound) {
            window.game.playSound('shootDj');
        }
    }
}
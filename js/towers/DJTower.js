import { Tower } from './BaseTower.js';
import { SoundWaveBullet } from './Bullet.js';

export class DJTower extends Tower {
    constructor(x, y) {
        super(x, y, 'dj');
        this.particles = [];
        this.discoAngle = 0;
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
        const speed = 500;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const sw = new SoundWaveBullet(
                this.x, this.y,
                this.target,
                this.damage,
                '#aa88ff',
                7,
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

    draw(ctx) {
        super.draw(ctx);

        const r = 15;
        const time = Date.now() / 1000;
        this.discoAngle += 0.02;

        // ---- Исправленные анимации с проверкой радиуса ----
        if (this.level >= 2) {
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI*2 + time * 0.8;
                const dist = r + 8 + 6 * Math.sin(time * 2 + i * 0.7);
                const radius = Math.abs(dist - r - 4); // гарантируем положительный радиус
                ctx.strokeStyle = `rgba(170,102,255,${0.2 + 0.2 * Math.sin(time * 1.5 + i)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(angle) * (r + 4), this.y + Math.sin(angle) * (r + 4), radius, 0, Math.PI*2);
                ctx.stroke();
            }
        }

        if (this.level >= 3) {
            const colors = ['#aa66ff', '#ff66aa', '#66ffaa'];
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI*2 + time * 0.5;
                const dist = r + 14 + 4 * Math.sin(time * 1.2 + i);
                const radius = Math.abs(6 + 3 * Math.sin(time * 2 + i)); // всегда положительный
                ctx.strokeStyle = colors[i];
                ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 1.8 + i);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, radius, 0, Math.PI*2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        if (this.level >= 4) {
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI*2 + time * 0.7;
                const dist = r + 20 + 4 * Math.sin(time * 1.5 + i * 0.5);
                ctx.fillStyle = `rgba(170,102,255,${0.3 + 0.2 * Math.sin(time * 2 + i)})`;
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('♪', this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist);
            }
        }

        if (this.level === 5) {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI*2 + time * 0.3;
                const len = r + 24 + 8 * Math.sin(time * 1.2 + i * 0.6);
                ctx.strokeStyle = `rgba(170,102,255,${0.1 + 0.2 * Math.sin(time * 1.3 + i)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * (r + 6), this.y + Math.sin(angle) * (r + 6));
                ctx.lineTo(this.x + Math.cos(angle) * len, this.y + Math.sin(angle) * len);
                ctx.stroke();
            }
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r + 10);
            grad.addColorStop(0, `rgba(170,102,255,${0.3 * (0.5 + 0.5 * Math.sin(time * 1.5))})`);
            grad.addColorStop(1, 'rgba(170,102,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 10, 0, Math.PI*2);
            ctx.fill();
        }
    }
}
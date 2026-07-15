import { Tower } from './BaseTower.js';
import { FlameBullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

export class FlameTower extends Tower {
    constructor(x, y) {
        super(x, y, 'flame');
        this.particles = [];
    }

    findTarget(enemies) {
        let best = null, maxProgress = -1;
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            if (!this.isInRange(e)) continue;
            if (e.burnTimer <= 0) {
                if (e.pathIndex > maxProgress) {
                    maxProgress = e.pathIndex;
                    best = e;
                }
            }
        }
        if (best) return best;
        maxProgress = -1;
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            if (this.isInRange(e) && e.pathIndex > maxProgress) {
                maxProgress = e.pathIndex;
                best = e;
            }
        }
        return best;
    }

    update(enemies, bullets, deltaTime) {
        if (this.shootFlash > 0) this.shootFlash -= deltaTime;
        if (this.stunnedUntil > 0) {
            this.stunnedUntil -= deltaTime;
            return;
        }
        if (this.cooldown > 0) this.cooldown -= deltaTime;
        if (this.target) {
            if (!this.target.isAlive() || !this.isInRange(this.target)) {
                this.target = null;
            }
        }
        if (!this.target) {
            this.target = this.findTarget(enemies);
        }
        if (this.target && this.cooldown <= 0) {
            // Накладываем горение на всех врагов в радиусе
            for (const e of enemies) {
                if (!e.isAlive()) continue;
                if (!this.isInRange(e)) continue;
                if (e.burnTimer <= 0) {
                    e.applyBurn(this.burnDuration, this.burnDamagePerSec);
                }
            }
            const count = this.burstCount || 3;
            const spread = 0.6;
            const baseAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const speed = 450;
            for (let i = 0; i < count; i++) {
                const angle = baseAngle + (Math.random() - 0.5) * spread;
                const variantSpeed = speed * (0.8 + Math.random() * 0.4);
                const fb = new FlameBullet(
                    this.x, this.y,
                    this.target,
                    0,
                    this.burnDuration,
                    this.burnDamagePerSec,
                    '#ff8800',
                    3, // уменьшен радиус снаряда
                    variantSpeed,
                    angle,
                    this.range,
                    this
                );
                bullets.push(fb);
            }
            this.cooldown = this.fireRate;
            this.shootFlash = 0.1;
            if (window.game && window.game.playSound) {
                window.game.playSound('shootFlame');
            }
        }
        this.particles = updateParticles(this.particles, deltaTime);
    }

    draw(ctx) {
        // Вызов базового draw, который рисует саму башню
        super.draw(ctx);

        const r = 15;
        const time = Date.now() / 1000;

        // ---- Анимированные улучшения для огнемёта ----
        if (this.level >= 2) {
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20 * (0.5 + 0.5 * Math.sin(time * 2.5));
            ctx.fillStyle = 'rgba(255,102,0,0.05)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 4, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        if (this.level >= 3) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI*2 + time * 0.9;
                const dist = r + 12 + 4 * Math.sin(time * 2 + i);
                ctx.fillStyle = `rgba(255,136,0,${0.2 + 0.3 * Math.sin(time * 1.8 + i)})`;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, 2 + Math.sin(time * 1.5 + i), 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (this.level >= 4) {
            ctx.strokeStyle = `rgba(255,68,0,${0.2 + 0.2 * Math.sin(time * 1.2)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 16 + 4 * Math.sin(time * 1.8), 0, Math.PI*2);
            ctx.stroke();
        }
        if (this.level === 5) {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI*2 + time * 0.6;
                const len = r + 22 + 6 * Math.sin(time * 1.4 + i * 0.8);
                ctx.strokeStyle = `rgba(255,100,0,${0.15 + 0.2 * Math.sin(time * 1.1 + i)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * (r + 6), this.y + Math.sin(angle) * (r + 6));
                ctx.lineTo(this.x + Math.cos(angle) * len, this.y + Math.sin(angle) * len);
                ctx.stroke();
            }
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r + 8);
            grad.addColorStop(0, `rgba(255,100,0,${0.3 * (0.5 + 0.5 * Math.sin(time * 2))})`);
            grad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 8, 0, Math.PI*2);
            ctx.fill();
        }
    }
}
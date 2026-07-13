import { Tower } from './BaseTower.js';
import { FlameBullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

export class FlameTower extends Tower {
    constructor(x, y) {
        super(x, y, 'flame');
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
            for (let i = 0; i < count * 2; i++) {
                const angle = baseAngle + (Math.random() - 0.5) * spread;
                const variantSpeed = speed * (0.8 + Math.random() * 0.4);
                const fb = new FlameBullet(
                    this.x, this.y,
                    this.target,
                    0,
                    this.burnDuration,
                    this.burnDamagePerSec,
                    '#ff8800',
                    4,
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
}
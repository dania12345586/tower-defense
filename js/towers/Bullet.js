import { createExplosion, updateParticles, drawParticles } from '../vfx/particles.js';
import { createSparks, createFlameSparks } from '../vfx/sparks.js';

// ============================================================
// ОБЫЧНЫЙ СНАРЯД
// ============================================================
export class Bullet {
    constructor(x, y, target, damage, color = '#ffff00', radius = 4, speed = 400, tower = null) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.radius = radius;
        this.color = color;
        this.isDead = false;
        this.tower = tower;
        this.sparks = createSparks(x, y, 5, 100, 0.5, '#ffff88');
        this.explosionParticles = [];
    }

    update(deltaTime) {
        if (this.isDead || !this.target || !this.target.isAlive()) {
            this.isDead = true;
            this.explosionParticles = createExplosion(this.x, this.y, 15, 150, this.color, [2, 5]);
            return;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed * deltaTime) {
            if (this.damage > 0) {
                this.target.takeDamage(this.damage);
                if (this.tower) this.tower.addDamage(this.damage);
            }
            this.isDead = true;
            this.explosionParticles = createExplosion(this.x, this.y, 15, 150, this.color, [2, 5]);
        } else {
            this.x += (dx / dist) * this.speed * deltaTime;
            this.y += (dy / dist) * this.speed * deltaTime;
        }
        this.sparks = updateParticles(this.sparks, deltaTime);
        this.explosionParticles = updateParticles(this.explosionParticles, deltaTime);
    }

    draw(ctx) {
        if (this.isDead) {
            drawParticles(ctx, this.explosionParticles);
            return;
        }
        drawParticles(ctx, this.sparks);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// ============================================================
// ОГНЕННЫЙ СНАРЯД
// ============================================================
export class FlameBullet extends Bullet {
    constructor(startX, startY, target, damage, burnDuration, burnDPS, color, radius, speed, angle, maxRange, tower) {
        super(startX, startY, target, damage, color, radius, speed, tower);
        this.x = startX;
        this.y = startY;
        this.target = target;
        this.burnDuration = burnDuration;
        this.burnDPS = burnDPS;
        this.color = color;
        this.radius = radius || 4;
        this.speed = speed;
        this.tower = tower;
        this.maxRange = maxRange;
        this.distTraveled = 0;
        this.trail = [];
        this.hitEnemies = new Set();

        const dx = target.x - startX;
        const dy = target.y - startY;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) {
            this.isDead = true;
            return;
        }
        const normX = dx / dist;
        const normY = dy / dist;
        const angleOffset = (Math.random() - 0.5) * 0.6;
        const cosA = Math.cos(angleOffset);
        const sinA = Math.sin(angleOffset);
        const dirX = normX * cosA - normY * sinA;
        const dirY = normX * sinA + normY * cosA;
        this.vx = dirX * speed;
        this.vy = dirY * speed;

        if (isNaN(this.vx) || isNaN(this.vy) || (this.vx === 0 && this.vy === 0)) {
            this.isDead = true;
            return;
        }

        this.sparks = createFlameSparks(startX, startY, 10, 150, 0.6);
        this.explosionParticles = [];
    }

    update(deltaTime) {
        if (this.isDead) return;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.distTraveled += Math.hypot(this.vx * deltaTime, this.vy * deltaTime);
        if (this.distTraveled >= this.maxRange) {
            this.isDead = true;
            this.explosionParticles = createExplosion(this.x, this.y, 25, 200, '#ff8800', [3, 7]);
            return;
        }
        this.trail.push({x: this.x, y: this.y, life: 0.3});
        if (this.trail.length > 10) this.trail.shift();
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= deltaTime;
            if (this.trail[i].life <= 0) this.trail.splice(i, 1);
        }
        this.sparks = updateParticles(this.sparks, deltaTime);
        if (Math.random() < 0.5) {
            const newSparks = createFlameSparks(this.x, this.y, 3, 80, 0.3);
            this.sparks = this.sparks.concat(newSparks);
        }
        this.explosionParticles = updateParticles(this.explosionParticles, deltaTime);
    }

    checkCollisions(enemies) {
        if (this.isDead) return;
        const splashRadius = 16;
        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;
            if (this.hitEnemies.has(enemy)) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            if (dx*dx + dy*dy <= splashRadius * splashRadius) {
                enemy.applyBurn(this.burnDuration, this.burnDPS);
                this.hitEnemies.add(enemy);
            }
        }
    }

    draw(ctx) {
        if (this.isDead) {
            drawParticles(ctx, this.explosionParticles);
            return;
        }
        drawParticles(ctx, this.sparks);
        for (const t of this.trail) {
            const alpha = t.life / 0.3;
            const r = this.radius * (0.5 + 0.5 * (t.life / 0.3));
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(t.x, t.y, r * 0.6, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        let radius = this.radius;
        if (!isFinite(radius) || radius <= 0) radius = 4;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 2.5);
        grad.addColorStop(0, '#ffff00');
        grad.addColorStop(0.3, '#ff8800');
        grad.addColorStop(0.7, '#ff4400');
        grad.addColorStop(1, '#cc2200');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 2.5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.8, 0, Math.PI*2);
        ctx.fill();
    }
}

// ============================================================
// ЗВУКОВАЯ ВОЛНА (DJ) – увеличен радиус и скорость
// ============================================================
export class SoundWaveBullet extends FlameBullet {
    constructor(x, y, target, damage, color, radius, speed, angle, maxRange, slowFactor, tower) {
        super(x, y, target, 0, 0, color, radius, speed, angle, maxRange, tower);
        this.damage = damage;
        this.slowFactor = slowFactor;
        this.radius = radius || 7; // увеличен радиус
        this.speed = speed || 500; // увеличенная скорость
        this.sparks = createSparks(x, y, 10, 120, 0.5, '#aa88ff');
        this.trail = [];
        this.maxTrail = 10;
        // пересчитываем vx/vy с новой скоростью
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const normX = dx / dist;
            const normY = dy / dist;
            const angleOffset = (Math.random() - 0.5) * 0.6;
            const cosA = Math.cos(angleOffset);
            const sinA = Math.sin(angleOffset);
            const dirX = normX * cosA - normY * sinA;
            const dirY = normX * sinA + normY * cosA;
            this.vx = dirX * this.speed;
            this.vy = dirY * this.speed;
        }
    }

    checkCollisions(enemies) {
        if (this.isDead) return;
        const splashRadius = 20;
        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;
            if (this.hitEnemies.has(enemy)) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            if (dx*dx + dy*dy <= splashRadius * splashRadius) {
                enemy.takeDamage(this.damage);
                enemy.applySlow(this.slowFactor);
                this.hitEnemies.add(enemy);
                if (this.tower) this.tower.addDamage(this.damage);
            }
        }
    }

    update(deltaTime) {
        if (this.isDead) return;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.distTraveled += Math.hypot(this.vx * deltaTime, this.vy * deltaTime);
        if (this.distTraveled >= this.maxRange) {
            this.isDead = true;
            this.explosionParticles = createExplosion(this.x, this.y, 15, 150, '#aa88ff', [2, 5]);
            return;
        }
        this.trail.push({x: this.x, y: this.y, life: 0.25});
        if (this.trail.length > this.maxTrail) this.trail.shift();
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= deltaTime;
            if (this.trail[i].life <= 0) this.trail.splice(i, 1);
        }
        this.sparks = updateParticles(this.sparks, deltaTime);
        this.explosionParticles = updateParticles(this.explosionParticles, deltaTime);
    }

    draw(ctx) {
        if (this.isDead) {
            drawParticles(ctx, this.explosionParticles);
            return;
        }
        drawParticles(ctx, this.sparks);
        for (const t of this.trail) {
            const alpha = t.life / 0.25;
            const r = this.radius * (0.5 + 0.5 * (t.life / 0.25));
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#aa88ff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#cc88ff';
        ctx.shadowColor = '#aa88ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI*2);
        ctx.fill();
    }
}
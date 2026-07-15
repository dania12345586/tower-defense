import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

// Мгновенный лазер с взрывом
class SatelliteLaser extends Bullet {
    constructor(x, y, target, damage, explosionRadius, tower) {
        super(x, y, target, damage, '#00ccff', 6, 9999, tower);
        this.explosionRadius = explosionRadius;
        this.isDead = false;
        this.life = 0.1; // живёт 0.1 сек, чтобы успеть нарисоваться
        this.timer = 0;
        this.color = '#00ccff';
        // Взрыв происходит сразу при создании (наносит урон)
        this.explode();
    }

    explode() {
        const cx = this.target.x;
        const cy = this.target.y;
        // Наносим урон всем врагам в радиусе взрыва
        for (const e of window.game.state.enemies) {
            if (!e.isAlive()) continue;
            const dx = e.x - cx;
            const dy = e.y - cy;
            if (dx*dx + dy*dy <= this.explosionRadius * this.explosionRadius) {
                e.takeDamage(this.damage);
                if (this.tower) this.tower.addDamage(this.damage);
            }
        }
        // Создаём визуальный взрыв (частицы)
        if (window.game) {
            const particles = [];
            const count = 30;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 150;
                const life = 0.3 + Math.random() * 0.5;
                const radius = 3 + Math.random() * 6;
                const color = Math.random() > 0.5 ? '#00ccff' : '#66eeff';
                particles.push({
                    x: cx + (Math.random() - 0.5) * 10,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: life,
                    maxLife: life,
                    radius: radius,
                    color: color
                });
            }
            // Добавляем частицы в глобальный массив (можно через window.game.particles)
            // Но проще – добавить их в объект взрыва, который будет рисоваться в draw
            this.explosionParticles = particles;
        }
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.life) {
            this.isDead = true;
        }
        // Обновляем частицы взрыва
        if (this.explosionParticles) {
            for (const p of this.explosionParticles) {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;
            }
            this.explosionParticles = this.explosionParticles.filter(p => p.life > 0);
        }
    }

    draw(ctx) {
        if (this.isDead && (!this.explosionParticles || this.explosionParticles.length === 0)) return;
        // Рисуем лазер (луч от башни до цели)
        if (!this.isDead) {
            const startX = this.tower.x;
            const startY = this.tower.y;
            const endX = this.target.x;
            const endY = this.target.y;
            ctx.save();
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
        }
        // Рисуем взрыв (частицы)
        if (this.explosionParticles) {
            for (const p of this.explosionParticles) {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }
    }
}

export class SatelliteTower extends Tower {
    constructor(x, y) {
        super(x, y, 'satellite');
        this.color = '#888888';
        this.buffRange = 150;
        this.attackRange = 1000;
        this.range = this.attackRange;
        this.baseRange = this.attackRange;
        this.baseDamage = 30;
        this.damage = 30;
        this.fireRate = 2.0;
        this.explosionRadius = 30;
        this.buffPercent = 8;
        this.cost = 400;
        this.upgradeCost = 500;
        this.maxLevel = 5;
        this.totalCost = 400;
        this.cooldown = 0;
        this.target = null;
        this.totalDamage = 0;
        this.shootFlash = 0;
        this.particles = [];
        // Для анимации вращения
        this.angle = 0;
        this.pulse = 0;
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        this.baseDamage = Math.floor(this.baseDamage * 1.35);
        this.fireRate = Math.max(1.5, this.fireRate * 0.92);
        this.explosionRadius = Math.floor(this.explosionRadius * 1.15);
        this.buffPercent += 3;
        this.upgradeCost = Math.floor(this.upgradeCost * 1.6);
        this.totalCost += this.upgradeCost;
        this.damage = this.baseDamage;
        if (this.isBuffed) {
            this.damage = Math.floor(this.baseDamage * this.buffDamageMult);
            this.fireRate = this.baseFireRate / this.buffFireRateMult;
        }
    }

    update(enemies, bullets, deltaTime) {
        if (this.stunnedUntil > 0) {
            this.stunnedUntil -= deltaTime;
            return;
        }

        // Анимация вращения
        this.angle += deltaTime * 1.5;
        this.pulse = 0.5 + 0.5 * Math.sin(Date.now() / 500);

        // Бафф дальности
        const buffMult = 1 + this.buffPercent / 100;
        for (const tower of window.game.state.towers) {
            if (tower === this) continue;
            const dx = tower.x - this.x;
            const dy = tower.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= this.buffRange) {
                tower.applyRangeBuff(buffMult);
            } else {
                tower.resetRangeBuff();
            }
        }

        // Атака лазером
        if (this.target) {
            if (!this.target.isAlive() || !this.isInRange(this.target)) {
                this.target = null;
            }
        }
        if (!this.target) {
            this.target = this.findTarget(enemies);
        }

        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
        }

        if (this.target && this.cooldown <= 0) {
            this.shoot(bullets);
            this.cooldown = this.fireRate;
            this.shootFlash = 0.1;
        }

        if (this.particles) {
            this.particles = updateParticles(this.particles, deltaTime);
        }
    }

    shoot(bullets) {
        if (!this.target) return;
        // Создаём мгновенный лазер с взрывом
        const laser = new SatelliteLaser(this.x, this.y, this.target, this.damage, this.explosionRadius, this);
        bullets.push(laser);
        if (window.game && window.game.playSound) {
            window.game.playSound('shootLaser');
        }
    }

    getStats() {
        const stats = super.getStats();
        stats['Бафф дальности'] = '+' + this.buffPercent + '%';
        stats['Радиус взрыва'] = this.explosionRadius;
        stats['Скорострельность'] = (1 / this.fireRate).toFixed(1) + '/сек';
        return stats;
    }

    draw(ctx) {
        super.draw(ctx);

        const r = 15;
        const time = Date.now() / 1000;

        // ---- Анимированные улучшения ----
        if (this.level >= 2) {
            // Вращающееся кольцо
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 2);
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 8, this.angle, this.angle + 1.2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.level >= 3) {
            // Два вращающихся кольца
            ctx.strokeStyle = '#33ddff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 14, -this.angle * 0.7, -this.angle * 0.7 + 1.8);
            ctx.stroke();
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 14, this.angle * 0.7 + 1.2, this.angle * 0.7 + 3.0);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this.level >= 4) {
            // Пульсирующие точки по кругу
            const count = 8;
            for (let i = 0; i < count; i++) {
                const ang = (i / count) * Math.PI * 2 + time * 0.8;
                const dist = r + 18 + 4 * Math.sin(time * 1.5 + i);
                const size = 2 + 2 * Math.sin(time * 2 + i * 1.2);
                ctx.fillStyle = `rgba(0, 204, 255, ${0.3 + 0.3 * Math.sin(time * 1.2 + i)})`;
                ctx.beginPath();
                ctx.arc(this.x + Math.cos(ang) * dist, this.y + Math.sin(ang) * dist, size, 0, Math.PI*2);
                ctx.fill();
            }
        }

        if (this.level === 5) {
            // Максимальный уровень – яркое свечение, мерцающие лучи
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2 + time * 0.5;
                const len = r + 24 + 6 * Math.sin(time * 1.2 + i * 0.7);
                ctx.strokeStyle = `rgba(0, 204, 255, ${0.1 + 0.15 * Math.sin(time * 0.9 + i)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(ang) * (r + 6), this.y + Math.sin(ang) * (r + 6));
                ctx.lineTo(this.x + Math.cos(ang) * len, this.y + Math.sin(ang) * len);
                ctx.stroke();
            }
            // Центральное свечение
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r + 10);
            grad.addColorStop(0, `rgba(0, 204, 255, ${0.3 * this.pulse})`);
            grad.addColorStop(1, 'rgba(0, 204, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 10, 0, Math.PI*2);
            ctx.fill();
        }

        // ---- Показ радиуса баффа (серый пунктир) ----
        if (this.showRange) {
            ctx.strokeStyle = 'rgba(136,136,136,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.buffRange, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}
import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

// Снаряд спутника – лазер с взрывом
class SatelliteLaser extends Bullet {
    constructor(x, y, target, damage, explosionRadius, tower) {
        super(x, y, target, damage, '#00ccff', 6, 800, tower);
        this.explosionRadius = explosionRadius;
        this.explosionParticles = [];
        this.color = '#00ccff';
    }

    update(deltaTime, enemies) {
        if (this.isDead) return;
        if (!this.target || !this.target.isAlive()) {
            this.isDead = true;
            return;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed * deltaTime) {
            // Попадание – взрыв
            this.explode(enemies);
            this.isDead = true;
        } else {
            this.x += (dx / dist) * this.speed * deltaTime;
            this.y += (dy / dist) * this.speed * deltaTime;
        }
    }

    explode(enemies) {
        const cx = this.target.x;
        const cy = this.target.y;
        // Наносим урон всем врагам в радиусе взрыва
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            const dx = e.x - cx;
            const dy = e.y - cy;
            if (dx*dx + dy*dy <= this.explosionRadius * this.explosionRadius) {
                e.takeDamage(this.damage);
                if (this.tower) this.tower.addDamage(this.damage);
            }
        }
        // Визуальный эффект взрыва (голубой)
        if (window.game) {
            // Создать частицы
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        // Рисуем лазер
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ccff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Трассер
        ctx.fillStyle = 'rgba(0,204,255,0.3)';
        ctx.beginPath();
        ctx.arc(this.x - 6, this.y - 6, this.radius * 0.6, 0, Math.PI*2);
        ctx.fill();
    }
}

export class SatelliteTower extends Tower {
    constructor(x, y) {
        super(x, y, 'satellite');
        this.color = '#888888';
        this.buffRange = 150;           // радиус баффа (не растёт)
        this.attackRange = 1000;        // радиус атаки (бесконечный)
        this.range = this.attackRange;  // основной радиус для поиска цели
        this.baseRange = this.attackRange;
        // Характеристики
        this.baseDamage = 30;
        this.damage = 30;
        this.fireRate = 2.0;
        this.explosionRadius = 30;
        this.buffPercent = 8;           // 8% баффа на 1 уровне
        this.cost = 400;
        this.upgradeCost = 500;
        this.maxLevel = 5;
        this.totalCost = 400;
        // Состояние
        this.cooldown = 0;
        this.target = null;
        this.totalDamage = 0;
        this.shootFlash = 0;
        this.particles = [];
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        // Дорогие апгрейды
        this.baseDamage = Math.floor(this.baseDamage * 1.35);
        this.fireRate = Math.max(1.5, this.fireRate * 0.92);
        this.explosionRadius = Math.floor(this.explosionRadius * 1.15);
        this.buffPercent += 3;           // +3% за уровень
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

        // ---- Бафф дальности для башен в радиусе buffRange ----
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

        // ---- Атака (поиск цели на всей карте) ----
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
        // Отрисовка базы
        super.draw(ctx);
        // Рисуем два радиуса: баффа (внутренний) и атаки (внешний, почти бесконечный)
        if (this.showRange) {
            // Внутренний радиус (бафф) – серый
            ctx.strokeStyle = 'rgba(136,136,136,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.buffRange, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            // Внешний радиус (атака) – голубой, но очень бледный
            ctx.strokeStyle = 'rgba(0,204,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI*2);
            ctx.stroke();
        }
        // Визуальные улучшения при апгрейдах
        if (this.level >= 2) {
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);
        }
        if (this.level >= 3) {
            ctx.fillStyle = 'rgba(0,204,255,0.1)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI*2);
            ctx.fill();
        }
        if (this.level >= 4) {
            ctx.fillStyle = '#00ccff';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.arc(this.x + 5, this.y + 5, 3, 0, Math.PI*2);
            ctx.fill();
        }
        if (this.level === 5) {
            ctx.fillStyle = '#0099ff';
            ctx.beginPath();
            ctx.arc(this.x - 10, this.y, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.arc(this.x + 10, this.y, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }
}
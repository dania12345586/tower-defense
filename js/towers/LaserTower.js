import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

class LaserBeam extends Bullet {
    constructor(x, y, target, damage, tower) {
        super(x, y, target, damage, '#ff00ff', 3, 9999, tower);
        this.isBeam = true;
        this.life = 0.05;
        this.timer = 0;
        this.color = '#ff44ff';
        this.chargePercent = tower ? tower.charge / tower.maxCharge : 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.life) {
            this.isDead = true;
            if (this.target && this.target.isAlive()) {
                this.target.takeDamage(this.damage);
                if (this.tower) this.tower.addDamage(this.damage);
            }
        }
    }

    draw(ctx) {
        if (this.isDead) return;
        const startX = this.tower ? this.tower.x : this.x;
        const startY = this.tower ? this.tower.y : this.y;
        const endX = this.target ? this.target.x : this.x;
        const endY = this.target ? this.target.y : this.y;

        const thickness = 2 + this.chargePercent * 6;
        const alpha = 0.6 + this.chargePercent * 0.4;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = thickness;
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 20 + this.chargePercent * 30;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 30 + this.chargePercent * 20);
        grad.addColorStop(0, `rgba(255, 68, 255, ${0.3 + this.chargePercent * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 68, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(midX, midY, 30 + this.chargePercent * 20, 0, Math.PI*2);
        ctx.fill();
    }
}

export class LaserTower extends Tower {
    constructor(x, y) {
        super(x, y, 'laser');
        this.color = '#ff44ff';
        // Базовые статы (из конфига)
        this.baseDamage = 4;
        this.chargeRate = 2;
        this.maxCharge = 15;
        this.fireRate = 0.22; // НЕ ИСПОЛЬЗУЕТСЯ ДЛЯ СТРЕЛЬБЫ (но оставлен для совместимости)
        this.range = 220;
        this.cost = 1000;
        this.upgradeCost = 700;
        // Состояние
        this.charge = 0;
        this.currentTarget = null;
        this.chargeTimer = 0;
        this.beam = null;
        this.maxLevel = 5;
        this.totalCost = 1000;
        this.totalDamage = 0;
        this.shootFlash = 0;
        this.particles = [];
        // КУЛДАУН УБРАН – АТАКУЕМ КАЖДЫЙ КАДР
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        // Микро-апгрейды
        this.baseDamage += 0.2;
        this.chargeRate += 0.3;
        this.maxCharge += 1;
        this.range = Math.floor(this.range * 1.015);
        // Скорость атаки не меняется
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

        // Поиск цели
        if (this.target) {
            if (!this.target.isAlive() || !this.isInRange(this.target)) {
                this.target = null;
                this.charge = 0;
                this.chargeTimer = 0;
            }
        }
        if (!this.target) {
            this.target = this.findTarget(enemies);
            if (this.target) {
                this.charge = 0;
                this.chargeTimer = 0;
            }
        }

        // АТАКА КАЖДЫЙ КАДР (без кулдауна)
        if (this.target) {
            // Зарядка
            this.chargeTimer += deltaTime;
            if (this.chargeTimer >= 0.1) {
                const chargeAdd = this.chargeRate * 0.1;
                this.charge = Math.min(this.maxCharge, this.charge + chargeAdd);
                this.chargeTimer = 0;
            }

            // Текущий урон
            let currentDamage = this.baseDamage + this.charge;
            if (this.isBuffed) {
                currentDamage = Math.floor(currentDamage * this.buffDamageMult);
            }

            // Создаём луч (каждый кадр)
            const beam = new LaserBeam(this.x, this.y, this.target, currentDamage, this);
            bullets.push(beam);
            this.shootFlash = 0.05;
        }

        if (this.particles) {
            this.particles = updateParticles(this.particles, deltaTime);
        }
    }

    getStats() {
        const stats = super.getStats();
        stats['Заряд (макс)'] = this.maxCharge;
        stats['Текущий урон'] = Math.floor(this.baseDamage + this.charge);
        stats['Скорость заряда'] = this.chargeRate + '/сек';
        return stats;
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.target && this.charge > 0) {
            const chargePercent = this.charge / this.maxCharge;
            const barWidth = 30;
            const barHeight = 4;
            const x = this.x - barWidth/2;
            const y = this.y - 25;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#ff44ff';
            ctx.fillRect(x, y, barWidth * chargePercent, barHeight);
        }
    }
}
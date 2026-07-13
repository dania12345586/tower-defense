import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';

// Специальный снаряд для лазера – просто линия, наносящая урон мгновенно
class LaserBeam extends Bullet {
    constructor(x, y, target, damage, tower) {
        super(x, y, target, damage, '#ff00ff', 3, 9999, tower); // огромная скорость
        this.isBeam = true;
        this.life = 0.05; // живёт 0.05 секунды
        this.timer = 0;
        this.color = '#ff44ff';
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.life) {
            this.isDead = true;
            // Наносим урон цели
            if (this.target && this.target.isAlive()) {
                this.target.takeDamage(this.damage);
                if (this.tower) this.tower.addDamage(this.damage);
            }
        }
        // Рисуем линию от башни к цели
        // draw будет рисовать линию
    }

    draw(ctx) {
        if (this.isDead) return;
        const startX = this.tower ? this.tower.x : this.x;
        const startY = this.tower ? this.tower.y : this.y;
        const endX = this.target ? this.target.x : this.x;
        const endY = this.target ? this.target.y : this.y;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff44ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Свечение в центре
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 20);
        grad.addColorStop(0, 'rgba(255, 68, 255, 0.6)');
        grad.addColorStop(1, 'rgba(255, 68, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(midX, midY, 20, 0, Math.PI*2);
        ctx.fill();
    }
}

export class LaserTower extends Tower {
    constructor(x, y) {
        super(x, y, 'laser');
        this.color = '#ff44ff';
        this.charge = 0; // текущая зарядка
        this.maxCharge = 50; // максимальная добавка к урону
        this.chargeRate = 5; // прирост урона в секунду
        this.currentTarget = null;
        this.chargeTimer = 0;
        this.beam = null;
        // Характеристики из конфига
        this.range = 220;
        this.baseDamage = 25;
        this.damage = 25;
        this.fireRate = 0.1; // очень быстрая стрельба для непрерывности
        this.cost = 600;
        this.upgradeCost = 400;
        this.maxLevel = 5;
        this.totalCost = 600;
        // Для хранения истории урона
        this.totalDamage = 0;
        this.shootFlash = 0;
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        // Увеличение урона, заряда, радиуса
        this.baseDamage = Math.floor(this.baseDamage * 1.2);
        this.chargeRate += 2;
        this.maxCharge += 10;
        this.range = Math.floor(this.range * 1.08);
        this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
        this.totalCost += this.upgradeCost;
        // Пересчёт текущего урона (без баффов)
        this.damage = this.baseDamage;
        if (this.isBuffed) {
            this.damage = Math.floor(this.baseDamage * this.buffDamageMult);
            this.fireRate = this.baseFireRate / this.buffFireRateMult;
        }
    }

    update(enemies, bullets, deltaTime) {
        // Обработка стана
        if (this.stunnedUntil > 0) {
            this.stunnedUntil -= deltaTime;
            return;
        }

        // Поиск цели
        if (this.target) {
            if (!this.target.isAlive() || !this.isInRange(this.target)) {
                this.target = null;
                this.charge = 0; // сброс заряда при смене цели
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

        // Если есть цель – атакуем
        if (this.target) {
            // Увеличиваем заряд, если цель та же
            this.chargeTimer += deltaTime;
            if (this.chargeTimer >= 0.1) { // обновляем каждые 0.1 секунды
                const chargeAdd = this.chargeRate * 0.1;
                this.charge = Math.min(this.maxCharge, this.charge + chargeAdd);
                this.chargeTimer = 0;
            }

            // Рассчитываем текущий урон
            let currentDamage = this.baseDamage + this.charge;
            // Применяем баффы
            if (this.isBuffed) {
                currentDamage = Math.floor(currentDamage * this.buffDamageMult);
            }

            // Создаём луч (каждый кадр)
            const beam = new LaserBeam(this.x, this.y, this.target, currentDamage, this);
            bullets.push(beam);
            this.shootFlash = 0.05;
        }

        // Обновление частиц (если есть)
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
        // Дополнительные визуальные эффекты: индикатор заряда
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
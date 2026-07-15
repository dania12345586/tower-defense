import { TOWER_TYPES } from '../configs/towerConfig.js';
import { updateParticles, drawParticles } from '../vfx/particles.js';
import { Bullet } from './Bullet.js';

export class Tower {
    constructor(x, y, type = 'pistol') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.maxLevel = 5;
        this.showRange = false;
        this.cooldown = 0;
        this.target = null;
        this.stunnedUntil = 0;
        this.totalDamage = 0;
        this.shootFlash = 0;
        this.totalCost = 0;

        const configs = TOWER_TYPES;
        const cfg = configs[type] || configs.pistol;
        Object.assign(this, cfg);
        if (type === 'flame') {
            this.burnDuration = cfg.burnDuration;
            this.burnDamagePerSec = cfg.burnDamagePerSec;
            this.burstCount = cfg.burstCount;
        }
        if (type === 'dj') {
            this.burstCount = cfg.burstCount;
            this.slowFactor = cfg.slowFactor;
        }
        this.baseDamage = this.damage;
        this.baseFireRate = this.fireRate;
        this.baseRange = this.range;
        this.rangeBuffMultiplier = 1;
        this.buffDamageMult = 1;
        this.buffFireRateMult = 1;
        this.isBuffed = false;
        this.particles = [];

        this.totalCost = this.cost;
    }

    applyRangeBuff(mult) {
        this.rangeBuffMultiplier = mult;
        this.range = Math.floor(this.baseRange * this.rangeBuffMultiplier);
    }
    resetRangeBuff() {
        this.rangeBuffMultiplier = 1;
        this.range = this.baseRange;
    }

    addDamage(amount) { this.totalDamage += amount; }

    applyBuff(dmgMult, frMult) {
        this.buffDamageMult = dmgMult;
        this.buffFireRateMult = frMult;
        this.damage = Math.floor(this.baseDamage * this.buffDamageMult);
        this.fireRate = this.baseFireRate / this.buffFireRateMult;
        this.isBuffed = true;
    }

    resetBuff() {
        this.buffDamageMult = 1;
        this.buffFireRateMult = 1;
        this.damage = this.baseDamage;
        this.fireRate = this.baseFireRate;
        this.isBuffed = false;
    }

    getBuffPercent() {
        if (!this.isBuffed) return null;
        return {
            damage: Math.round((this.buffDamageMult - 1) * 100),
            fireRate: Math.round((this.buffFireRateMult - 1) * 100)
        };
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
            this.shoot(bullets);
            this.cooldown = this.fireRate;
            this.shootFlash = 0.1;
        }
        this.particles = updateParticles(this.particles, deltaTime);
    }

    findTarget(enemies) {
        let best = null, maxProgress = -1;
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            if (this.isInRange(e) && e.pathIndex > maxProgress) {
                maxProgress = e.pathIndex;
                best = e;
            }
        }
        return best;
    }

    // Исправленная дальность по краю врага
    isInRange(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        return Math.hypot(dx, dy) <= this.range + enemy.radius;
    }

    shoot(bullets) {
        if (!this.target) return;
        bullets.push(new Bullet(this.x, this.y, this.target, this.damage, '#ffff00', 4, 400, this));
        if (window.game && window.game.playSound) {
            window.game.playSound('shootPistol');
        }
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        if (this.type === 'pistol') {
            if (this.level % 2 === 0) this.baseDamage = Math.floor(this.baseDamage * 1.3);
            else this.range = Math.floor(this.range * 1.1);
            if (this.level % 2 === 0) this.baseFireRate = Math.max(0.4, this.baseFireRate * 0.95);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.4);
        } else if (this.type === 'flame') {
            this.burnDuration += 0.5;
            this.burnDamagePerSec = Math.floor(this.burnDamagePerSec * 1.25);
            this.range = Math.floor(this.range * 1.08);
            this.burstCount = Math.min(6, (this.burstCount || 3) + 1);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.4);
        } else if (this.type === 'dj') {
            this.burstCount = Math.min(6, (this.burstCount || 3) + 1);
            this.range = Math.floor(this.range * 1.1);
            this.slowFactor = Math.max(0.70, this.slowFactor - 0.025);
            this.baseDamage = Math.floor(this.baseDamage * 1.3);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.4);
        }
        this.totalCost += this.upgradeCost;
        if (this.isBuffed) {
            this.damage = Math.floor(this.baseDamage * this.buffDamageMult);
            this.fireRate = this.baseFireRate / this.buffFireRateMult;
        } else {
            this.damage = this.baseDamage;
            this.fireRate = this.baseFireRate;
        }
        if (this.rangeBuffMultiplier !== 1) {
            this.range = Math.floor(this.baseRange * this.rangeBuffMultiplier);
        }
    }

    stun(duration) {
        this.stunnedUntil = Math.max(this.stunnedUntil, duration);
    }

    getBuffMultipliers() {
        if (this.type === 'dj') {
            const dmgMult = 1.04 + (this.level - 1) * 0.025;
            const frMult = 1.05 + (this.level - 1) * 0.025;
            return { dmgMult, frMult };
        }
        return null;
    }

    getStats() {
        let stats = {
            'Уровень': this.level + '/' + this.maxLevel,
            'Дальность': this.range,
            'Интервал': this.fireRate.toFixed(2) + ' с',
            'Нанесено урона': Math.floor(this.totalDamage)
        };
        let dps = 0;
        if (this.type === 'pistol') {
            stats['Урон'] = this.damage;
            dps = this.damage / this.fireRate;
        } else if (this.type === 'flame') {
            stats['Урон'] = this.burnDamagePerSec + ' (горение/с)';
            stats['Горение (сек)'] = this.burnDuration;
            stats['Урон горения/с'] = this.burnDamagePerSec;
            stats['Струя'] = (this.burstCount || 3) + ' снарядов';
            dps = this.burnDamagePerSec;
        } else if (this.type === 'dj') {
            stats['Урон'] = this.damage;
            stats['Замедление'] = (1 - this.slowFactor) * 100 + '%';
            stats['Волн'] = this.burstCount || 3;
            dps = this.damage / this.fireRate;
            const mult = this.getBuffMultipliers();
            if (mult) {
                const dmgBonus = Math.round((mult.dmgMult - 1) * 100);
                const frBonus = Math.round((mult.frMult - 1) * 100);
                stats['Бафф урона'] = '+' + dmgBonus + '%';
                stats['Бафф скорости'] = '+' + frBonus + '%';
            }
        } else if (this.type === 'satellite') {
            stats['Урон'] = this.damage;
            stats['Бафф дальности'] = '+' + this.buffPercent + '%';
            stats['Радиус взрыва'] = this.explosionRadius;
            stats['Скорострельность'] = (1 / this.fireRate).toFixed(1) + '/сек';
            dps = this.damage / this.fireRate;
        }
        stats['DPS'] = dps.toFixed(1);

        const buff = this.getBuffPercent();
        if (buff) {
            if (buff.damage > 0) stats['Бафф урона (акт.)'] = '+' + buff.damage + '%';
            if (buff.fireRate > 0) stats['Бафф скорости (акт.)'] = '+' + buff.fireRate + '%';
        }
        if (this.rangeBuffMultiplier !== 1) {
            const bonus = Math.round((this.rangeBuffMultiplier - 1) * 100);
            stats['Бафф дальности (акт.)'] = '+' + bonus + '%';
        }
        return stats;
    }

    getStatsForLevel(level) {
        let range = this.range;
        let damage = this.baseDamage;
        let fireRate = this.baseFireRate;
        let upgradeCost = this.upgradeCost;
        let burnDuration = this.burnDuration || 0;
        let burnDamagePerSec = this.burnDamagePerSec || 0;
        let burstCount = this.burstCount || 1;
        let slowFactor = this.slowFactor || 1;

        for (let lv = 2; lv <= level; lv++) {
            if (this.type === 'pistol') {
                if (lv % 2 === 0) damage = Math.floor(damage * 1.3);
                else range = Math.floor(range * 1.1);
                if (lv % 2 === 0) fireRate = Math.max(0.4, fireRate * 0.95);
                upgradeCost = Math.floor(upgradeCost * 1.4);
            } else if (this.type === 'flame') {
                burnDuration += 0.5;
                burnDamagePerSec = Math.floor(burnDamagePerSec * 1.25);
                range = Math.floor(range * 1.08);
                burstCount = Math.min(6, burstCount + 1);
                upgradeCost = Math.floor(upgradeCost * 1.4);
            } else if (this.type === 'dj') {
                burstCount = Math.min(6, burstCount + 1);
                range = Math.floor(range * 1.1);
                slowFactor = Math.max(0.70, slowFactor - 0.025);
                damage = Math.floor(damage * 1.3);
                upgradeCost = Math.floor(upgradeCost * 1.4);
            } else if (this.type === 'satellite') {
                // спутник апгрейдится отдельно
            }
        }

        let stats = {
            'Уровень': level + '/' + this.maxLevel,
            'Дальность': range,
            'Интервал': fireRate.toFixed(2) + ' с',
        };
        let dps = 0;
        if (this.type === 'pistol') {
            stats['Урон'] = damage;
            dps = damage / fireRate;
        } else if (this.type === 'flame') {
            stats['Урон'] = burnDamagePerSec + ' (горение/с)';
            stats['Горение (сек)'] = burnDuration;
            stats['Урон горения/с'] = burnDamagePerSec;
            stats['Струя'] = burstCount + ' снарядов';
            dps = burnDamagePerSec;
        } else if (this.type === 'dj') {
            stats['Урон'] = damage;
            stats['Замедление'] = (1 - slowFactor) * 100 + '%';
            stats['Волн'] = burstCount;
            dps = damage / fireRate;
        }
        stats['DPS'] = dps.toFixed(1);
        return stats;
    }

    // ----- ВИЗУАЛЬНЫЕ УЛУЧШЕНИЯ ДЛЯ ПИСТОЛЕТЧИКА (и для всех, если type === 'pistol') -----
    draw(ctx) {
        if (this.showRange) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        const r = 15;
        const time = Date.now() / 1000;

        // Базовая башня
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - r - 2, this.y - r - 2, (r+2)*2, (r+2)*2);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - r, this.y - r, r*2, r*2);
        ctx.strokeStyle = this.level >= 2 ? '#ffd700' : '#fff';
        ctx.lineWidth = this.level >= 2 ? 3 : 2;
        ctx.strokeRect(this.x - r, this.y - r, r*2, r*2);

        // ---- Пистолетчик: анимированные улучшения ----
        if (this.type === 'pistol') {
            if (this.level >= 2) {
                // Лёгкое свечение
                ctx.shadowColor = '#4444ff';
                ctx.shadowBlur = 15 * (0.5 + 0.5 * Math.sin(time * 2));
                ctx.fillStyle = 'rgba(68,68,255,0.05)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, r + 4, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            if (this.level >= 3) {
                // Вращающиеся линии
                ctx.strokeStyle = '#4444ff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 1.5);
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI*2 + time * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.cos(angle) * (r + 4), this.y + Math.sin(angle) * (r + 4));
                    ctx.lineTo(this.x + Math.cos(angle) * (r + 12), this.y + Math.sin(angle) * (r + 12));
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
            if (this.level >= 4) {
                // Мерцающие точки
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI*2 + time * 0.8;
                    const dist = r + 14 + 3 * Math.sin(time * 1.2 + i);
                    ctx.fillStyle = `rgba(68,68,255,${0.3 + 0.3 * Math.sin(time * 1.5 + i)})`;
                    ctx.beginPath();
                    ctx.arc(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, 2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            if (this.level >= 5) {
                // Максимум – яркие лучи
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI*2 + time * 0.4;
                    const len = r + 18 + 5 * Math.sin(time * 1.8 + i * 0.5);
                    ctx.strokeStyle = `rgba(68,68,255,${0.15 + 0.15 * Math.sin(time * 1.2 + i)})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(this.x + Math.cos(angle) * (r + 6), this.y + Math.sin(angle) * (r + 6));
                    ctx.lineTo(this.x + Math.cos(angle) * len, this.y + Math.sin(angle) * len);
                    ctx.stroke();
                }
                // Центральный пульс
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r + 6);
                grad.addColorStop(0, `rgba(68,68,255,${0.2 * (0.5 + 0.5 * Math.sin(time * 2))})`);
                grad.addColorStop(1, 'rgba(68,68,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r + 6, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // ----- Остальной общий код -----
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.level, this.x, this.y);

        if (this.shootFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.shootFlash * 2})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.8, 0, Math.PI*2);
            ctx.fill();
        }

        if (this.target) {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
            ctx.stroke();
        }

        if (this.stunnedUntil > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 10 + Math.random() * 20;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist);
                ctx.stroke();
            }
        }

        if (this.isBuffed) {
            ctx.strokeStyle = 'rgba(170,102,255,0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 4, 0, Math.PI*2);
            ctx.stroke();
        }

        drawParticles(ctx, this.particles);
    }

    containsPoint(x, y) {
        return Math.abs(x - this.x) <= 15 && Math.abs(y - this.y) <= 15;
    }
}
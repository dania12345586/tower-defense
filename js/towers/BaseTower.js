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
        this.buffDamageMult = 1;
        this.buffFireRateMult = 1;
        this.isBuffed = false;
        this.particles = [];

        this.totalCost = this.cost;
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

    isInRange(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        return dx*dx + dy*dy <= this.range * this.range;
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
        }
        stats['DPS'] = dps.toFixed(1);

        const buff = this.getBuffPercent();
        if (buff) {
            if (buff.damage > 0) stats['Бафф урона (акт.)'] = '+' + buff.damage + '%';
            if (buff.fireRate > 0) stats['Бафф скорости (акт.)'] = '+' + buff.fireRate + '%';
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
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - r - 2, this.y - r - 2, (r+2)*2, (r+2)*2);

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - r, this.y - r, r*2, r*2);

        ctx.strokeStyle = this.level >= 2 ? '#ffd700' : '#fff';
        ctx.lineWidth = this.level >= 2 ? 3 : 2;
        ctx.strokeRect(this.x - r, this.y - r, r*2, r*2);

        if (this.type === 'pistol') {
            if (this.level >= 2) {
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - 10, this.y - 10);
                ctx.lineTo(this.x + 10, this.y - 10);
                ctx.stroke();
            }
            if (this.level >= 3) {
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - 10, this.y + 10);
                ctx.lineTo(this.x + 10, this.y + 10);
                ctx.stroke();
            }
            if (this.level >= 4) {
                ctx.fillStyle = '#555';
                ctx.fillRect(this.x + 8, this.y - 4, 6, 8);
            }
            if (this.level === 5) {
                ctx.fillStyle = '#555';
                ctx.fillRect(this.x + 8, this.y - 12, 4, 8);
                ctx.fillRect(this.x + 8, this.y + 4, 4, 8);
                ctx.fillStyle = '#777';
                ctx.fillRect(this.x + 12, this.y - 14, 2, 4);
                ctx.fillRect(this.x + 12, this.y + 10, 2, 4);
            }
        } else if (this.type === 'flame') {
            if (this.level >= 2) {
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.arc(this.x - 6, this.y - 6, 4, 0, Math.PI*2);
                ctx.fill();
                ctx.arc(this.x + 6, this.y + 6, 4, 0, Math.PI*2);
                ctx.fill();
            }
            if (this.level >= 4) {
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.arc(this.x - 10, this.y, 3, 0, Math.PI*2);
                ctx.fill();
                ctx.arc(this.x + 10, this.y, 3, 0, Math.PI*2);
                ctx.fill();
            }
            if (this.level === 5) {
                ctx.fillStyle = '#ff8800';
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.arc(this.x + i*8, this.y + 12, 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        } else if (this.type === 'dj') {
            if (this.level >= 2) {
                ctx.fillStyle = '#8844aa';
                ctx.fillRect(this.x - r - 6, this.y - 12, 4, 24);
                ctx.fillRect(this.x + r + 2, this.y - 12, 4, 24);
            }
            if (this.level >= 4) {
                ctx.strokeStyle = '#aa66ff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 5; i++) {
                    const angle = (i/5) * Math.PI*2;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + Math.cos(angle)*r*1.6, this.y + Math.sin(angle)*r*1.6);
                    ctx.stroke();
                }
            }
            if (this.level === 5) {
                ctx.strokeStyle = '#cc88ff';
                ctx.lineWidth = 1;
                const time = Date.now()/1000;
                for (let i = 0; i < 12; i++) {
                    const angle = (i/12) * Math.PI*2 + time;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x + Math.cos(angle)*r*2, this.y + Math.sin(angle)*r*2);
                    ctx.stroke();
                }
            }
        }

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
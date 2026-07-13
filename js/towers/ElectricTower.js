import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';
import { UPGRADE_COST_MULTIPLIER } from '../configs/towerConfig.js';

// ============================================================
// ЭЛЕКТРИЧЕСКИЙ СНАРЯД
// ============================================================
export class ElectricBullet extends Bullet {
    constructor(x, y, target, damage, tower) {
        super(x, y, target, damage, '#00ccff', 5, 600, tower);
        this.maxChains = tower.maxChains || 3;
        this.chainRange = tower.chainRange || 160;
        this.stunChance = tower.stunChance || 0.03;
        this.stunDuration = tower.stunDuration || 1.2;
        this.bounceDamageMultiplier = tower.bounceDamageMultiplier || 0.5;
        this.stunImmuneBoss = tower.stunImmuneBoss || false;
        this.bounceCount = 0;
        this.currentTarget = target;
        this.visited = new Set();
        this.visited.add(target);
        this.isDead = false;
        this.chainLinks = [];
        this.sparks = [];
        for (let i = 0; i < 10; i++) {
            this.sparks.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.2 + Math.random() * 0.4,
                maxLife: 0.6,
                radius: 2 + Math.random() * 4,
                color: '#00ccff'
            });
        }
        this.chainLinks.push({ x1: this.x, y1: this.y, x2: target.x, y2: target.y });
    }

    update(deltaTime, enemies) {
        if (this.isDead) return;
        for (const s of this.sparks) {
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            s.life -= deltaTime;
        }
        this.sparks = this.sparks.filter(s => s.life > 0);

        if (this.currentTarget && this.currentTarget.isAlive()) {
            const dx = this.currentTarget.x - this.x;
            const dy = this.currentTarget.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.speed * deltaTime) {
                this.hitTarget(this.currentTarget);
                this.findNextTarget(enemies);
            } else {
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
                if (this.chainLinks.length > 0) {
                    const last = this.chainLinks[this.chainLinks.length - 1];
                    last.x2 = this.x;
                    last.y2 = this.y;
                }
                if (Math.random() < 0.3) {
                    this.sparks.push({
                        x: this.x + (Math.random() - 0.5) * 10,
                        y: this.y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 150,
                        vy: (Math.random() - 0.5) * 150,
                        life: 0.2 + Math.random() * 0.3,
                        maxLife: 0.5,
                        radius: 2 + Math.random() * 3,
                        color: '#00ccff'
                    });
                }
            }
        } else {
            this.isDead = true;
        }
        this.sparks = this.sparks.filter(s => s.life > 0);
    }

    hitTarget(enemy) {
        let damage = this.damage;
        if (this.bounceCount > 0) {
            damage = Math.floor(damage * this.bounceDamageMultiplier);
        }
        enemy.takeDamage(damage);
        if (this.tower) this.tower.addDamage(damage);
        const isBoss = (enemy.type === 'boss' || enemy.type === 'megaboss' || enemy.type === 'elite_boss');
        if (!isBoss && Math.random() < this.stunChance) {
            enemy.stun(this.stunDuration);
            enemy.electricEffect = 0.5;
        }
        const hitX = enemy.x;
        const hitY = enemy.y;
        if (this.chainLinks.length > 0) {
            const last = this.chainLinks[this.chainLinks.length - 1];
            this.chainLinks.push({ x1: last.x2, y1: last.y2, x2: hitX, y2: hitY });
        }
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 200;
            this.sparks.push({
                x: hitX,
                y: hitY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.2 + Math.random() * 0.5,
                maxLife: 0.7,
                radius: 2 + Math.random() * 5,
                color: '#00ccff'
            });
        }
    }

    findNextTarget(enemies) {
        this.bounceCount++;
        if (this.bounceCount >= this.maxChains) {
            this.isDead = true;
            return;
        }
        const px = this.currentTarget.x;
        const py = this.currentTarget.y;
        let best = null;
        let bestDist = Infinity;
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            if (this.visited.has(e)) continue;
            const dx = e.x - px;
            const dy = e.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist <= this.chainRange && dist < bestDist) {
                bestDist = dist;
                best = e;
            }
        }
        if (best) {
            this.currentTarget = best;
            this.visited.add(best);
            this.x = px;
            this.y = py;
            this.chainLinks.push({ x1: px, y1: py, x2: best.x, y2: best.y });
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 150;
                this.sparks.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.2 + Math.random() * 0.4,
                    maxLife: 0.6,
                    radius: 2 + Math.random() * 4,
                    color: '#00ccff'
                });
            }
        } else {
            this.isDead = true;
        }
    }

    draw(ctx) {
        if (this.isDead) {
            for (const s of this.sparks) {
                const alpha = s.life / s.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius * alpha, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            return;
        }
        for (const s of this.sparks) {
            const alpha = s.life / s.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * alpha, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (const link of this.chainLinks) {
            const brightness = 0.7 + 0.3 * (this.bounceCount / this.maxChains);
            ctx.strokeStyle = `rgba(0, 200, 255, ${brightness})`;
            ctx.lineWidth = 2 + this.bounceCount;
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 25;
            const dx = link.x2 - link.x1;
            const dy = link.y2 - link.y1;
            const segments = 6;
            ctx.beginPath();
            ctx.moveTo(link.x1, link.y1);
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const x = link.x1 + dx * t + (Math.random() - 0.5) * 10;
                const y = link.y1 + dy * t + (Math.random() - 0.5) * 10;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (this.currentTarget) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

// ============================================================
// ЭЛЕКТРОШОКЕР
// ============================================================
export class ElectricTower extends Tower {
    constructor(x, y) {
        super(x, y, 'electric');
        this.color = '#00ccff';
        this.chainRange = this.chainRange || 160;
        this.maxChains = this.maxChains || 3;
        this.bounceDamageMultiplier = this.bounceDamageMultiplier || 0.5;
        this.stunChance = (this.stunChanceBase || 0.03) + (this.level - 1) * (this.stunChancePerLevel || 0.017);
        this.stunDuration = this.stunDuration || 1.2;
        this.stunImmuneBoss = this.stunImmuneBoss || true;
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        if (this.level % 2 === 0) this.baseDamage = Math.floor(this.baseDamage * 1.35);
        else this.range = Math.floor(this.range * 1.1);
        if (this.level % 2 === 0) this.baseFireRate = Math.max(0.4, this.baseFireRate * 0.92);
        this.upgradeCost = Math.floor(this.upgradeCost * UPGRADE_COST_MULTIPLIER);
        this.stunChance = (this.stunChanceBase || 0.03) + (this.level - 1) * (this.stunChancePerLevel || 0.017);
        if (this.isBuffed) {
            this.damage = Math.floor(this.baseDamage * this.buffDamageMult);
            this.fireRate = this.baseFireRate / this.buffFireRateMult;
        } else {
            this.damage = this.baseDamage;
            this.fireRate = this.baseFireRate;
        }
    }

    shoot(bullets) {
        if (!this.target) return;
        const bullet = new ElectricBullet(this.x, this.y, this.target, this.damage, this);
        bullet.maxChains = Math.min(this.level, this.maxChains);
        bullet.chainRange = this.chainRange;
        bullet.stunChance = this.stunChance;
        bullet.stunDuration = this.stunDuration;
        bullet.bounceDamageMultiplier = this.bounceDamageMultiplier;
        bullet.stunImmuneBoss = this.stunImmuneBoss;
        bullets.push(bullet);
        if (window.game && window.game.playSound) {
            window.game.playSound('shootElectric');
        }
    }

    getStats() {
        const stats = super.getStats();
        const dps = this.damage / this.fireRate;
        stats['DPS'] = dps.toFixed(1);
        stats['Цепей'] = Math.min(this.level, this.maxChains);
        stats['Шанс стана'] = Math.round(this.stunChance * 100) + '%';
        stats['Урон отскока'] = Math.round(this.damage * this.bounceDamageMultiplier);
        return stats;
    }

    draw(ctx) {
        super.draw(ctx);
        const r = 15;
        if (this.level >= 2) {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + Date.now() / 1000;
                const len = r * (1 + this.level * 0.1);
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
                const endX = this.x + Math.cos(angle) * len;
                const endY = this.y + Math.sin(angle) * len;
                const steps = 5;
                for (let j = 1; j <= steps; j++) {
                    const t = j / steps;
                    const x = this.x + Math.cos(angle) * (r + t * (len - r)) + (Math.random() - 0.5) * 6;
                    const y = this.y + Math.sin(angle) * (r + t * (len - r)) + (Math.random() - 0.5) * 6;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        if (this.level >= 4) {
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(0, 200, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        if (this.level === 5) {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + Date.now() / 1500;
                const len = r * 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
                const endX = this.x + Math.cos(angle) * len;
                const endY = this.y + Math.sin(angle) * len;
                const steps = 8;
                for (let j = 1; j <= steps; j++) {
                    const t = j / steps;
                    const x = this.x + Math.cos(angle) * (r + t * (len - r)) + (Math.random() - 0.5) * 10;
                    const y = this.y + Math.sin(angle) * (r + t * (len - r)) + (Math.random() - 0.5) * 10;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
    }
}
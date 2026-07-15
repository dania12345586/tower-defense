import { Tower } from './BaseTower.js';
import { Bullet } from './Bullet.js';
import { updateParticles } from '../vfx/particles.js';

class ShotgunBullet extends Bullet {
    constructor(x, y, target, damage, tower) {
        super(x, y, target, damage, '#A0522D', 4, 500, tower);
        this.piercing = true;
        this.hitEnemies = new Set();
        this.startX = x;
        this.startY = y;
        this.vx = 0;
        this.vy = 0;
    }

    update(deltaTime, enemies) {
        if (this.isDead) return;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        for (const e of enemies) {
            if (!e.isAlive()) continue;
            if (this.hitEnemies.has(e)) continue;
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            if (dx*dx + dy*dy < 20*20) {
                this.hitTarget(e);
                if (!this.piercing) {
                    this.isDead = true;
                    break;
                }
            }
        }

        const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
        if (dist > 300) this.isDead = true;
    }

    hitTarget(enemy) {
        if (this.hitEnemies.has(enemy)) return;
        enemy.takeDamage(this.damage);
        if (this.tower) this.tower.addDamage(this.damage);
        this.hitEnemies.add(enemy);
    }

    draw(ctx) {
        if (this.isDead) return;
        ctx.fillStyle = this.color;
        ctx.shadowColor = '#A0522D';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(160,82,45,0.3)';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, this.radius * 0.6, 0, Math.PI*2);
        ctx.fill();
    }
}

export class ShotgunTower extends Tower {
    constructor(x, y) {
        super(x, y, 'shotgun');
        this.color = '#A0522D';
        this.baseDamage = 24;
        this.damage = 24;
        this.range = 100;
        this.fireRate = 0.7;
        this.bulletsPerShot = 5;
        this.bursts = 3;
        this.reloadTime = 2.5;
        this.cost = 250;
        this.upgradeCost = 350;
        this.maxLevel = 5;
        this.totalCost = 250;
        this.currentBurst = 0;           // сколько выстрелов сделано
        this.reloading = false;
        this.reloadTimer = 0;
        this.cooldown = 0;
        this.totalDamage = 0;
        this.shootFlash = 0;
        this.particles = [];
    }

    upgrade() {
        if (this.level >= this.maxLevel) return;
        this.level++;
        this.baseDamage = Math.floor(this.baseDamage * 1.25);
        this.range = Math.floor(this.range * 1.08);
        if (this.level === 3) this.bulletsPerShot += 1;
        if (this.level === 5) this.bursts += 1;
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

        // ---- Поиск цели ----
        if (this.target) {
            if (!this.target.isAlive() || !this.isInRange(this.target)) {
                this.target = null;
                // НЕ СБРАСЫВАЕМ ПАТРОНЫ И НЕ ПРЕРЫВАЕМ ПЕРЕЗАРЯДКУ
            }
        }
        if (!this.target) {
            this.target = this.findTarget(enemies);
            // При появлении новой цели НЕ СБРАСЫВАЕМ ПАТРОНЫ
            // Просто продолжаем с текущим состоянием
        }

        // ---- Если цели нет – просто обновляем частицы ----
        if (!this.target) {
            if (this.particles) {
                this.particles = updateParticles(this.particles, deltaTime);
            }
            return;
        }

        // ---- Перезарядка (если она идёт) ----
        if (this.reloading) {
            this.reloadTimer -= deltaTime;
            if (this.reloadTimer <= 0) {
                this.reloading = false;
                this.currentBurst = 0;   // патроны восстановлены
                this.cooldown = 0;
                this.reloadTimer = 0;
            }
            return;
        }

        // ---- Если патроны закончились, начинаем перезарядку ----
        if (this.currentBurst >= this.bursts) {
            this.reloading = true;
            this.reloadTimer = this.reloadTime;
            this.currentBurst = this.bursts; // показываем полную полоску как пустую
            return;
        }

        // ---- Кулдаун между выстрелами ----
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            return;
        }

        // ---- Выстрел ----
        this.shoot(bullets);
        this.currentBurst++;
        this.cooldown = this.fireRate;
        this.shootFlash = 0.1;

        // ---- Проверка на окончание патронов (после выстрела) ----
        if (this.currentBurst >= this.bursts) {
            // Перезарядка начнётся на следующем кадре (в условии выше)
        }

        if (this.particles) {
            this.particles = updateParticles(this.particles, deltaTime);
        }
    }

    shoot(bullets) {
        if (!this.target) return;
        const spread = 0.5;
        const baseAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        for (let i = 0; i < this.bulletsPerShot; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const bullet = new ShotgunBullet(this.x, this.y, null, this.damage, this);
            bullet.vx = Math.cos(angle) * 500;
            bullet.vy = Math.sin(angle) * 500;
            bullet.startX = this.x;
            bullet.startY = this.y;
            bullets.push(bullet);
        }
        if (window.game && window.game.playSound) {
            window.game.playSound('shootShotgun');
        }
    }

    getStats() {
        const stats = super.getStats();
        stats['Пулей'] = this.bulletsPerShot;
        stats['Разрядов'] = this.bursts;
        stats['Перезарядка'] = this.reloadTime + 'с';
        const dps = ((this.baseDamage * this.bulletsPerShot * this.bursts) / (this.bursts * this.fireRate + this.reloadTime));
        stats['ДПС'] = dps.toFixed(1);
        return stats;
    }

    draw(ctx) {
        super.draw(ctx);

        // ---- Полоска патронов (над башней) ----
        const barWidth = 30;
        const barHeight = 4;
        const x = this.x - barWidth/2;
        const y = this.y - 25;

        if (this.reloading) {
            // Перезарядка – прогресс
            const progress = 1 - (this.reloadTimer / this.reloadTime);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(x, y, barWidth * progress, barHeight);
        } else {
            // Патроны – сегменты
            const segments = this.bursts;
            const segWidth = barWidth / segments;
            const filled = this.currentBurst; // сколько уже потрачено (0 = полный магазин)
            for (let i = 0; i < segments; i++) {
                const segX = x + i * segWidth;
                const isFilled = (i < segments - filled);
                ctx.fillStyle = isFilled ? '#A0522D' : 'rgba(100,100,100,0.5)';
                ctx.fillRect(segX, y, segWidth - 1, barHeight);
            }
        }

        // ---- Визуальные улучшения при апгрейдах ----
        if (this.level >= 2) {
            ctx.strokeStyle = '#A0522D';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);
        }
        if (this.level >= 3) {
            ctx.fillStyle = 'rgba(160,82,45,0.15)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI*2);
            ctx.fill();
        }
        if (this.level >= 4) {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.arc(this.x + 5, this.y + 5, 3, 0, Math.PI*2);
            ctx.fill();
        }
        if (this.level === 5) {
            ctx.fillStyle = '#5C2E00';
            ctx.beginPath();
            ctx.arc(this.x - 10, this.y, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.arc(this.x + 10, this.y, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }
}
import { ENEMY_TYPES } from './configs/waveConfig.js';

export class Enemy {
    constructor(path, type) {
        const config = ENEMY_TYPES[type];
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.speed = config.speed;
        this.reward = config.reward;
        this.damageToBase = config.damageToBase;
        this.radius = config.radius;
        this.color = config.color;
        this.isDead = false;
        this.reachedEnd = false;
        this.slowEffect = 1;
        this.burnTimer = 0;
        this.burnDamagePerTick = 0;
        this.burnSource = null;
        this.type = type;
        this.stunnedUntil = 0;
        this.electricEffect = 0;

        this.isHealer = config.isHealer || false;
        this.healRadius = config.healRadius || 0;
        this.healAmount = config.healAmount || 0;
        this.isSniper = config.isSniper || false;
        this.stunDuration = config.stunDuration || 0;
        this.shootCooldown = config.shootCooldown || 0;
        this.sniperTimer = 0;
    }

    update(deltaTime, enemies, towers) {
        if (this.isDead || this.reachedEnd) return;

        if (this.electricEffect > 0) {
            this.electricEffect -= deltaTime;
        }

        if (this.stunnedUntil > 0) {
            this.stunnedUntil -= deltaTime;
            return;
        }

        if (this.burnTimer > 0) {
            const damage = this.burnDamagePerTick * deltaTime;
            this.burnTimer -= deltaTime;
            this.takeDamage(damage);
            if (this.burnSource) {
                this.burnSource.addDamage(damage);
            }
        }

        if (this.isHealer && this.isAlive()) {
            for (const other of enemies) {
                if (other === this || !other.isAlive()) continue;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                if (dx*dx + dy*dy <= this.healRadius * this.healRadius) {
                    other.hp = Math.min(other.maxHp, other.hp + this.healAmount * deltaTime);
                }
            }
        }

        if (this.isSniper && this.isAlive() && towers && towers.length > 0) {
            this.sniperTimer += deltaTime;
            if (this.sniperTimer >= this.shootCooldown) {
                this.sniperTimer = 0;
                const targetTower = towers[Math.floor(Math.random() * towers.length)];
                if (targetTower) {
                    targetTower.stun(this.stunDuration);
                }
            }
        }

        const speed = this.speed * this.slowEffect;
        if (this.pathIndex < this.path.length - 1) {
            const target = this.path[this.pathIndex + 1];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < speed * deltaTime) {
                this.pathIndex++;
                if (this.pathIndex >= this.path.length - 1) this.reachedEnd = true;
            } else {
                this.x += (dx / dist) * speed * deltaTime;
                this.y += (dy / dist) * speed * deltaTime;
            }
        }
        if (this.slowEffect < 1) this.slowEffect = Math.min(1, this.slowEffect + 0.5 * deltaTime);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
    }

    applyBurn(duration, damagePerSecond, sourceTower = null) {
        if (duration > this.burnTimer) {
            this.burnTimer = duration;
            this.burnDamagePerTick = damagePerSecond;
            this.burnSource = sourceTower;
        }
    }

    applySlow(factor) {
        this.slowEffect = Math.min(this.slowEffect, factor);
    }

    stun(duration) {
        this.stunnedUntil = Math.max(this.stunnedUntil, duration);
    }

    isAlive() {
        return !this.isDead && !this.reachedEnd;
    }

    draw(ctx) {
        if (this.isDead) return;

        if (this.electricEffect > 0) {
            const intensity = Math.min(1, this.electricEffect / 0.5);
            for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = this.radius * (0.8 + Math.random() * 0.6);
                const x = this.x + Math.cos(angle) * dist;
                const y = this.y + Math.sin(angle) * dist;
                ctx.fillStyle = `rgba(0, 200, 255, ${intensity * (0.3 + Math.random() * 0.5)})`;
                ctx.beginPath();
                ctx.arc(x, y, 2 + Math.random() * 4, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.4})`;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = this.radius * (1.2 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * this.radius * 0.8, this.y + Math.sin(angle) * this.radius * 0.8);
                const endX = this.x + Math.cos(angle) * dist;
                const endY = this.y + Math.sin(angle) * dist;
                const steps = 4;
                for (let j = 1; j <= steps; j++) {
                    const t = j / steps;
                    const x = this.x + Math.cos(angle) * (this.radius * 0.8 + t * (dist - this.radius * 0.8)) + (Math.random() - 0.5) * 4;
                    const y = this.y + Math.sin(angle) * (this.radius * 0.8 + t * (dist - this.radius * 0.8)) + (Math.random() - 0.5) * 4;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        if (this.stunnedUntil > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', this.x, this.y - this.radius - 15);
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (this.isHealer) {
            ctx.strokeStyle = 'rgba(0,255,100,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5,5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.healRadius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#00ff88';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+', this.x, this.y - this.radius - 12);
        }

        if (this.isSniper) {
            ctx.strokeStyle = '#ff44ff';
            ctx.lineWidth = 2;
            const s = this.radius + 4;
            ctx.beginPath();
            ctx.moveTo(this.x - s, this.y);
            ctx.lineTo(this.x + s, this.y);
            ctx.moveTo(this.x, this.y - s);
            ctx.lineTo(this.x, this.y + s);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.x, this.y, s, 0, Math.PI*2);
            ctx.stroke();
        }

        if (this.burnTimer > 0) {
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,100,0,0.15)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI*2);
            ctx.fill();
        }

        const barW = this.radius * 2;
        const barH = 4;
        const barX = this.x - barW/2;
        const barY = this.y - this.radius - 8;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barW, barH);
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
}

export function createEnemy(path, type) {
    return new Enemy(path, type);
}

// ============================================================
// МЕГА-БОСС (способности только для вулканического босса)
// ============================================================
export class Megaboss extends Enemy {
    constructor(path, isVolcano = false) {
        super(path, 'megaboss');
        this.hp = isVolcano ? 14000 : 8000;
        this.maxHp = this.hp;
        this.speed = isVolcano ? 22 : 25;
        this.reward = isVolcano ? 750 : 500;
        this.damageToBase = isVolcano ? 40 : 30;
        this.radius = isVolcano ? 60 : 50;
        this.color = isVolcano ? '#ff3300' : '#aa44ff';
        this.isVolcano = isVolcano;
        this.type = 'megaboss';

        // ---- ОСНОВНАЯ СПОСОБНОСТЬ (только для вулкана) ----
        if (isVolcano) {
            // 1. Метание сгустка лавы в башню
            this.lavaBallCooldown = 4.0; // раз в 4 секунды
            this.lavaBallTimer = 0;
            this.lavaBallStunDuration = 1.5; // стан 1.5 секунды
            // 2. Извержение лавы (AoE оглушение)
            this.eruptionCooldown = 10.0; // раз в 10 секунд
            this.eruptionTimer = 0;
            this.eruptionRadius = 200;
            this.eruptionStunDuration = 2.0; // стан 2 секунды

            // Визуальные эффекты
            this.lavaBalls = [];
            this.eruptionEffect = 0;
        } else {
            // Обычный босс – без дополнительных способностей
            this.lavaBallCooldown = 0;
            this.lavaBallTimer = 0;
            this.eruptionCooldown = 0;
            this.eruptionTimer = 0;
            this.lavaBalls = [];
            this.eruptionEffect = 0;
        }

        // Оставляем старую способность оглушения в радиусе (она уже есть в Enemy через isSniper, но убираем)
        // На случай, если старый код остался – мы переопределим update.
    }

    update(deltaTime, enemies, towers) {
        // Вызываем родительский update (движение, горение, стан)
        super.update(deltaTime, enemies, towers);
        if (this.isDead || this.reachedEnd) return;

        // Если босс не вулканический – ничего не делаем
        if (!this.isVolcano) return;

        // ---- НОВЫЕ СПОСОБНОСТИ (только для вулкана) ----
        if (towers && towers.length > 0) {
            // 1. Метание сгустка лавы
            this.lavaBallTimer += deltaTime;
            if (this.lavaBallTimer >= this.lavaBallCooldown) {
                this.lavaBallTimer = 0;
                const targetTower = towers[Math.floor(Math.random() * towers.length)];
                if (targetTower) {
                    this.lavaBalls.push({
                        x: this.x,
                        y: this.y,
                        targetX: targetTower.x,
                        targetY: targetTower.y,
                        target: targetTower,
                        progress: 0,
                        speed: 0.5, // время полёта 0.5 сек
                        stunDuration: this.lavaBallStunDuration
                    });
                }
            }

            // Обновляем снаряды лавы
            for (let i = this.lavaBalls.length - 1; i >= 0; i--) {
                const ball = this.lavaBalls[i];
                ball.progress += deltaTime / ball.speed;
                if (ball.progress >= 1) {
                    if (ball.target && ball.target.stun) {
                        ball.target.stun(ball.stunDuration);
                    }
                    this.lavaBalls.splice(i, 1);
                }
            }

            // 2. Извержение лавы (AoE оглушение)
            this.eruptionTimer += deltaTime;
            if (this.eruptionTimer >= this.eruptionCooldown) {
                this.eruptionTimer = 0;
                if (towers) {
                    for (const tower of towers) {
                        const dx = tower.x - this.x;
                        const dy = tower.y - this.y;
                        if (dx*dx + dy*dy <= this.eruptionRadius * this.eruptionRadius) {
                            tower.stun(this.eruptionStunDuration);
                        }
                    }
                }
                this.eruptionEffect = 0.5;
            }
        }

        // Обновляем эффект извержения
        if (this.eruptionEffect > 0) {
            this.eruptionEffect -= deltaTime;
        }
    }

    draw(ctx) {
        // Рисуем базового врага
        super.draw(ctx);

        if (!this.isVolcano) {
            // Обычный босс – корона
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👑', this.x, this.y - this.radius - 20);
            return;
        }

        // ---- ВУЛКАНИЧЕСКИЙ БОСС ----
        // Лавовое свечение
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 30;
        ctx.fillStyle = 'rgba(255, 68, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Лавовые прожилки
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Date.now() / 2000;
            const r1 = this.radius * 0.5;
            const r2 = this.radius * 0.9;
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(angle) * r1, this.y + Math.sin(angle) * r1);
            ctx.lineTo(this.x + Math.cos(angle + 0.2) * r2, this.y + Math.sin(angle + 0.2) * r2);
            ctx.stroke();
        }

        // Эффект пепла (частицы)
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = this.radius * (1 + Math.random() * 0.5);
            const size = 2 + Math.random() * 4;
            ctx.fillStyle = `rgba(100, 100, 100, ${0.2 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, size, 0, Math.PI*2);
            ctx.fill();
        }

        // ---- РИСУЕМ СНАРЯДЫ ЛАВЫ ----
        for (const ball of this.lavaBalls) {
            const progress = ball.progress;
            const x = ball.x + (ball.targetX - ball.x) * progress;
            const y = ball.y + (ball.targetY - ball.y) * progress;
            // Яркий огненный шар
            const grad = ctx.createRadialGradient(x, y, 0, x, y, 12);
            grad.addColorStop(0, '#ffff00');
            grad.addColorStop(0.4, '#ff8800');
            grad.addColorStop(1, '#ff2200');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI*2);
            ctx.fill();
            // Хвост
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(x - 8, y - 4, 6, 0, Math.PI*2);
            ctx.fill();
        }

        // ---- ЭФФЕКТ ИЗВЕРЖЕНИЯ ----
        if (this.eruptionEffect > 0) {
            const alpha = this.eruptionEffect / 0.5;
            // Красное кольцо
            ctx.strokeStyle = `rgba(255, 50, 0, ${alpha * 0.8})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.eruptionRadius * (1 - (0.5 - this.eruptionEffect) / 0.5 * 0.3), 0, Math.PI*2);
            ctx.stroke();
            // Волны
            ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.4})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const r = this.eruptionRadius * (0.3 + i * 0.35);
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI*2);
                ctx.stroke();
            }
        }
    }
}
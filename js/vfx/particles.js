// Базовый класс частицы
export class Particle {
    constructor(x, y, vx, vy, life, maxLife, radius, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = maxLife || life;
        this.radius = radius || 3;
        this.color = color || '#ff8800';
        this.isDead = false;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= deltaTime;
        if (this.life <= 0) this.isDead = true;
    }

    draw(ctx) {
        if (this.isDead) return;
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (0.3 + 0.7 * alpha), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Создать взрыв из множества частиц
export function createExplosion(x, y, count = 20, speed = 200, color = '#ff8800', radiusRange = [2, 6]) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedVar = speed * (0.4 + Math.random() * 0.6);
        const life = 0.3 + Math.random() * 0.7;
        const radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            Math.cos(angle) * speedVar,
            Math.sin(angle) * speedVar,
            life, life, radius, color
        ));
    }
    return particles;
}

// Обновить массив частиц, удалить мёртвые
export function updateParticles(particles, deltaTime) {
    for (const p of particles) p.update(deltaTime);
    return particles.filter(p => !p.isDead);
}

// Нарисовать все частицы
export function drawParticles(ctx, particles) {
    for (const p of particles) p.draw(ctx);
}
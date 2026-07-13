import { Particle, createExplosion, updateParticles, drawParticles } from './particles.js';

// Создать искры для снаряда (обычные)
export function createSparks(x, y, count = 5, speed = 100, life = 0.5, color = '#ffff88') {
    const sparks = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedVar = speed * (0.5 + Math.random() * 0.5);
        sparks.push(new Particle(
            x + (Math.random() - 0.5) * 6,
            y + (Math.random() - 0.5) * 6,
            Math.cos(angle) * speedVar,
            Math.sin(angle) * speedVar,
            life * (0.5 + Math.random() * 0.5),
            life,
            2 + Math.random() * 3,
            color
        ));
    }
    return sparks;
}

// Создать искры для огненной струи
export function createFlameSparks(x, y, count = 8, speed = 150, life = 0.6) {
    const sparks = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speedVar = speed * (0.3 + Math.random() * 0.7);
        const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        sparks.push(new Particle(
            x + (Math.random() - 0.5) * 8,
            y + (Math.random() - 0.5) * 8,
            Math.cos(angle) * speedVar,
            Math.sin(angle) * speedVar,
            life * (0.5 + Math.random() * 0.5),
            life,
            3 + Math.random() * 5,
            color
        ));
    }
    return sparks;
}

// Прокси для функций из particles
export { updateParticles, drawParticles, createExplosion };
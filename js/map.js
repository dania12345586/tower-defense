export class GameMap {
    constructor(width, height, tileSize = 40, mapType = 'default') {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.cols = Math.floor(width / tileSize);
        this.rows = Math.floor(height / tileSize);
        this.mapType = mapType;
        this.occupiedCells = new Set();

        const pathData = this.createPath(mapType);
        this.paths = pathData.paths || [];
        this.obstacles = pathData.obstacles || [];

        if (this.paths.length === 0) {
            this.paths = this.createPath('default').paths;
        }
        this.path = this.paths[0] || [];

        this.decorations = this.generateDecorations(mapType);
        this.staticElements = this.generateStaticElements(mapType);

        this.snowParticles = [];
        if (mapType === 'snow') {
            for (let i = 0; i < 150; i++) {
                this.snowParticles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    speed: 20 + Math.random() * 40,
                    size: 1.5 + Math.random() * 3,
                    wind: (Math.random() - 0.5) * 20
                });
            }
        }
    }

    updateSnow(deltaTime) {
        if (this.mapType !== 'snow') return;
        for (const p of this.snowParticles) {
            p.x += p.wind * deltaTime;
            p.y += p.speed * deltaTime;
            if (p.y > this.height) {
                p.y = -5;
                p.x = Math.random() * this.width;
            }
            if (p.x < -5) p.x = this.width + 5;
            if (p.x > this.width + 5) p.x = -5;
        }
    }

    createPath(mapType) {
        const paths = [];
        let obstacles = [];

        if (mapType === 'default') {
            const tile = this.tileSize;
            paths.push([
                { x: -20, y: tile * 3 },
                { x: tile * 3, y: tile * 3 },
                { x: tile * 3, y: tile * 8 },
                { x: tile * 8, y: tile * 8 },
                { x: tile * 8, y: tile * 2 },
                { x: tile * 14, y: tile * 2 },
                { x: tile * 14, y: tile * 10 },
                { x: tile * 18, y: tile * 10 },
                { x: this.width + 20, y: tile * 10 }
            ]);
        } else if (mapType === 'forest') {
            const tile = this.tileSize;
            paths.push([
                { x: -20, y: tile * 2 },
                { x: tile * 2, y: tile * 2 },
                { x: tile * 2, y: tile * 5 },
                { x: tile * 6, y: tile * 5 },
                { x: tile * 6, y: tile * 2 },
                { x: tile * 10, y: tile * 2 },
                { x: tile * 10, y: tile * 7 },
                { x: tile * 14, y: tile * 7 },
                { x: tile * 14, y: tile * 2 },
                { x: tile * 18, y: tile * 2 },
                { x: tile * 18, y: tile * 10 },
                { x: this.width + 20, y: tile * 10 }
            ]);
        } else if (mapType === 'snow') {
            paths.push([
                { x: 20, y: 60 },
                { x: 60, y: 60 },
                { x: 60, y: 100 },
                { x: 60, y: 140 },
                { x: 60, y: 220 },
                { x: 60, y: 260 },
                { x: 60, y: 300 },
                { x: 60, y: 460 },
                { x: 260, y: 460 },
                { x: 260, y: 220 },
                { x: 780, y: 220 }
            ]);
            paths[0][0].x = -20;
            paths[0][paths[0].length - 1].x = this.width + 20;
        } else if (mapType === 'lunar') {
            paths.push([
                { x: 20, y: 540 },
                { x: 340, y: 540 },
                { x: 340, y: 60 },
                { x: 60, y: 60 },
                { x: 60, y: 300 },
                { x: 740, y: 300 },
                { x: 740, y: 60 },
                { x: 500, y: 60 },
                { x: 500, y: 540 },
                { x: 780, y: 540 }
            ]);
            paths[0][0].x = -20;
            paths[0][paths[0].length - 1].x = this.width + 20;
            obstacles = [
                { x: 397.3297730307076, y: 242.1590404264771, radius: 30 },
                { x: 245.66088117489986, y: 135.53976010661927, radius: 18 },
                { x: 725.233644859813, y: 423.4118169702354, radius: 18 },
                { x: 176.23497997329773, y: 575.8773878276321, radius: 16 },
                { x: 46.99599465954606, y: 390.3598400710795, radius: 16 },
                { x: 459.279038718291, y: 45.979564637938694, radius: 16 },
                { x: 433.6448598130841, y: 569.4802310084407, radius: 50 }
            ];
        } else if (mapType === 'mushroom') {
            paths.push([
                { x: 20, y: 140 },
                { x: 180, y: 140 },
                { x: 180, y: 60 },
                { x: 340, y: 60 },
                { x: 340, y: 380 },
                { x: 180, y: 380 },
                { x: 180, y: 540 },
                { x: 780, y: 540 }
            ]);
            paths[0][0].x = -20;
            paths[0][paths[0].length - 1].x = this.width + 20;
            obstacles = [
                { x: 480.64085447263017, y: 234.69569080408706, radius: 34 },
                { x: 653.671562082777, y: 135.53976010661927, radius: 34 },
                { x: 138.85180240320426, y: 196.31274988893824, radius: 15 },
                { x: 302.2696929238985, y: 107.81874722345623, radius: 15 },
                { x: 61.94926568758344, y: 542.8254109284762, radius: 15 },
                { x: 529.7730307076101, y: 474.5890715237672, radius: 19 },
                { x: 48.06408544726301, y: 202.7099067081297, radius: 18 },
                { x: 473.16421895861146, y: 86.49489115948467, radius: 26 },
                { x: 689.9866488651535, y: 491.64815637494445, radius: 35 }
            ];
        } else if (mapType === 'volcano') {
            const tile = this.tileSize;
            const pathTop = [
                { x: -20, y: tile * 2 },
                { x: tile * 4, y: tile * 2 },
                { x: tile * 4, y: tile * 4 },
                { x: tile * 8, y: tile * 4 },
                { x: tile * 8, y: tile * 2 },
                { x: tile * 12, y: tile * 2 },
                { x: tile * 12, y: tile * 4 },
                { x: tile * 16, y: tile * 4 },
                { x: tile * 16, y: tile * 2 },
                { x: this.width + 20, y: tile * 2 }
            ];
            const pathBottom = [
                { x: -20, y: tile * 10 },
                { x: tile * 4, y: tile * 10 },
                { x: tile * 4, y: tile * 8 },
                { x: tile * 8, y: tile * 8 },
                { x: tile * 8, y: tile * 10 },
                { x: tile * 12, y: tile * 10 },
                { x: tile * 12, y: tile * 8 },
                { x: tile * 16, y: tile * 8 },
                { x: tile * 16, y: tile * 10 },
                { x: this.width + 20, y: tile * 10 }
            ];
            paths.push(pathTop, pathBottom);
            obstacles = [
                { x: 278.7716955941255, y: 366.9035984007108, radius: 18 },
                { x: 659.0120160213618, y: 268.8138605064416, radius: 18 },
                { x: 49.13217623497997, y: 171.79031541537094, radius: 18 },
                { x: 157.00934579439252, y: 480.98622834295867, radius: 25 },
                { x: 395.1935914552737, y: 196.31274988893824, radius: 32 },
                { x: 215.75433911882507, y: 27.854286983562858, radius: 42 },
                { x: 698.5313751668891, y: 541.7592181252776, radius: 42 }
            ];
        } else {
            const tile = this.tileSize;
            paths.push([
                { x: -20, y: tile * 3 },
                { x: tile * 3, y: tile * 3 },
                { x: tile * 3, y: tile * 8 },
                { x: tile * 8, y: tile * 8 },
                { x: tile * 8, y: tile * 2 },
                { x: tile * 14, y: tile * 2 },
                { x: tile * 14, y: tile * 10 },
                { x: tile * 18, y: tile * 10 },
                { x: this.width + 20, y: tile * 10 }
            ]);
        }

        return { paths, obstacles };
    }

    generateDecorations(mapType) {
        const decs = [];
        if (mapType === 'default') {
            // Никаких декораций
        } else if (mapType === 'forest') {
            for (let i = 0; i < 20; i++) {
                const x = 30 + Math.random() * (this.width - 60);
                const y = 30 + Math.random() * (this.height - 60);
                if (!this.isOnPath(x, y)) {
                    decs.push({ type: 'tree', x, y, radius: 8 + Math.random() * 10 });
                }
            }
        }
        return decs;
    }

    generateStaticElements(mapType) {
        return [];
    }

    isOnPath(px, py, threshold = this.tileSize * 0.9) {
        for (const path of this.paths) {
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i + 1];
                const dist = this.distanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
                if (dist < threshold) {
                    return true;
                }
            }
        }
        return false;
    }

    isBuildBlocked(px, py) {
        for (const obs of this.obstacles) {
            const dx = px - obs.x;
            const dy = py - obs.y;
            if (dx*dx + dy*dy <= obs.radius * obs.radius) {
                return true;
            }
        }
        return false;
    }

    canBuildAt(gridX, gridY) {
        const key = `${gridX},${gridY}`;
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return false;
        if (this.occupiedCells.has(key)) return false;

        const tile = this.tileSize;
        // Проверяем не только центр, но и всю область башни (квадрат 30x30)
        const cx = gridX * tile + tile/2;
        const cy = gridY * tile + tile/2;
        const halfSize = 15; // радиус башни

        // Проверяем углы и центр
        const points = [
            {x: cx, y: cy}, // центр
            {x: cx - halfSize, y: cy - halfSize},
            {x: cx + halfSize, y: cy - halfSize},
            {x: cx - halfSize, y: cy + halfSize},
            {x: cx + halfSize, y: cy + halfSize}
        ];
        for (const p of points) {
            if (this.isBuildBlocked(p.x, p.y)) {
                return false;
            }
        }

        // Проверка на пути (используем центр клетки для скорости)
        for (const path of this.paths) {
            for (let i = 0; i < path.length - 1; i++) {
                const p1 = path[i];
                const p2 = path[i + 1];
                const dist = this.distanceToSegment(cx, cy, p1.x, p1.y, p2.x, p2.y);
                if (dist < this.tileSize * 0.8) {
                    return false;
                }
            }
        }

        return true;
    }

    distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        const dx = px - xx, dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    pixelToGrid(x, y) {
        return { gridX: Math.floor(x / this.tileSize), gridY: Math.floor(y / this.tileSize) };
    }

    gridToPixel(gridX, gridY) {
        return { x: gridX * this.tileSize + this.tileSize / 2, y: gridY * this.tileSize + this.tileSize / 2 };
    }

    occupyCell(gridX, gridY) {
        this.occupiedCells.add(`${gridX},${gridY}`);
    }

    draw(ctx) {
        // Фоны
        if (this.mapType === 'lunar') {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath();
            ctx.arc(100, 80, 50, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#d0d0d0';
            ctx.beginPath();
            ctx.arc(90, 70, 12, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(115, 85, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(80, 95, 6, 0, Math.PI*2);
            ctx.fill();
            for (const obs of this.obstacles) {
                ctx.fillStyle = 'rgba(60,60,80,0.6)';
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(100,100,120,0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = 'rgba(40,40,60,0.4)';
                ctx.beginPath();
                ctx.arc(obs.x - 4, obs.y - 4, obs.radius * 0.5, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (this.mapType === 'snow') {
            ctx.fillStyle = '#b0c4de';
            ctx.fillRect(0, 0, this.width, this.height);
            for (const p of this.snowParticles) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (this.mapType === 'mushroom') {
            ctx.fillStyle = '#2d5a2d';
            ctx.fillRect(0, 0, this.width, this.height);
            for (const obs of this.obstacles) {
                // Ножка
                ctx.fillStyle = '#d9b382';
                ctx.fillRect(obs.x - 3, obs.y, 6, 10);
                // Шляпка (красная)
                ctx.fillStyle = '#ff4d4d';
                ctx.beginPath();
                ctx.arc(obs.x, obs.y - 2, obs.radius * 0.6, Math.PI, 0);
                ctx.fill();
                // Белые точки убраны
            }
        } else if (this.mapType === 'volcano') {
            ctx.fillStyle = '#1a0a0a';
            ctx.fillRect(0, 0, this.width, this.height);
            for (const obs of this.obstacles) {
                const grad = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, obs.radius);
                grad.addColorStop(0, '#ff6600');
                grad.addColorStop(0.7, '#cc3300');
                grad.addColorStop(1, '#551100');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        } else {
            if (this.mapType === 'forest') {
                ctx.fillStyle = '#1a3a1a';
                ctx.fillRect(0, 0, this.width, this.height);
                for (const d of this.decorations) {
                    if (d.type === 'tree') {
                        ctx.fillStyle = '#2a5a2a';
                        ctx.beginPath();
                        ctx.arc(d.x, d.y, d.radius, 0, Math.PI*2);
                        ctx.fill();
                        ctx.fillStyle = '#3a6a3a';
                        ctx.beginPath();
                        ctx.arc(d.x - d.radius*0.2, d.y - d.radius*0.2, d.radius*0.4, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            } else {
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, this.width, this.height);
            }
        }

        if (this.mapType !== 'snow') {
            ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= this.width; x += this.tileSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
                ctx.stroke();
            }
            for (let y = 0; y <= this.height; y += this.tileSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
                ctx.stroke();
            }
        }

        for (const path of this.paths) {
            if (!path || path.length === 0) continue;
            ctx.strokeStyle = this.mapType === 'forest' ? '#5a3a2a' : '#3a3a2a';
            ctx.lineWidth = this.tileSize * 0.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
            ctx.strokeStyle = this.mapType === 'forest' ? '#7a5a4a' : '#5a5a4a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        }

        if (this.paths.length > 0 && this.paths[0] && this.paths[0].length > 0) {
            const firstPath = this.paths[0];
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(firstPath[0].x, firstPath[0].y, 8, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(firstPath[firstPath.length - 1].x, firstPath[firstPath.length - 1].y, 8, 0, Math.PI*2);
            ctx.fill();
        }
    }
}
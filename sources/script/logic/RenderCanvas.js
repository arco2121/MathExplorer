/*
For colors, set this CSS vars : 
    --grid: #ffffff87;
    --grid-light: #d2d2d285;
    --axis: #ffffff;
    --axis-light: #d2d2d2;
    --font: <fontname>

Or any other color with this variables names in the :root
*/
class SimpleRenderMathCanvas {
    constructor(canvas, zoomMax = 1e6, zoomMin = 1e-1, initialZoom = 110, sensitivity = 0.005, delayRender = 80, pixelSize = 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };
        /*Interactions*/
        this.isDragging = false;
        this.lastMousePos = {
            x: 0,
            y: 0
        };
        this.isMoving = false;
        this.renderTimeout = null;

        // Configuration
        this.colors = {
            grid: '#e0e0e0',
            gridLight: '#f5f5f5',
            axis: '#999999',
            axisLight: '#bbbbbb',
        }
        this.minZoom = zoomMin;
        this.initialZoom = initialZoom
        this.maxZoom = zoomMax;
        this.zoomSensitivity = sensitivity;
        this.renderDelay = delayRender
        this.functions = [];
        this.pixelScale = pixelSize
        this.setupCanvas();
        this.setupEventListeners();
        this.getCSSConfig();
        this.render();
        this.zoomToOrigin(this.initialZoom)
    }
    setupCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), {
            passive: false
        });
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onTouchEnd());
        window.addEventListener('resize', () => this.setupCanvas());
        window.addEventListener("changed_theme", () => this.render())
    }
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMousePos = {
            x: e.clientX,
            y: e.clientY
        };
        this.canvas.style.cursor = 'grabbing';
    }
    onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;

        this.camera.x += dx;
        this.camera.y += dy;

        this.lastMousePos = {
            x: e.clientX,
            y: e.clientY
        };

        this.startMoving();
        this.renderWhileMove();
    }
    onMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
        this.stopMoving();
    }
    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMousePos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    }
    onTouchMove(e) {
        e.preventDefault();

        if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastMousePos.x;
            const dy = e.touches[0].clientY - this.lastMousePos.y;

            this.camera.x += dx;
            this.camera.y += dy;

            this.lastMousePos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };

            this.startMoving();
            this.renderWhileMove();
        }
    }
    onTouchEnd() {
        this.isDragging = false;
        this.stopMoving();
    }
    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Posizione nel mondo prima dello zoom
        const worldX = (mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - this.camera.y) / this.camera.zoom;

        // Nuovo zoom
        const delta = -e.deltaY * this.zoomSensitivity;
        const newZoom = Math.min(
            Math.max(this.camera.zoom * (1 + delta), this.minZoom),
            this.maxZoom
        );

        // Aggiorna camera per mantenere il punto sotto il mouse fisso
        this.camera.zoom = newZoom;
        this.camera.x = mouseX - worldX * this.camera.zoom;
        this.camera.y = mouseY - worldY * this.camera.zoom;

        this.startMoving();
        this.renderWhileMove();
    }
    onClick(e) {
        const x = e.touches[0].clientX
        const y = e.touches[0].clientY
        return [x,y]
    }
    startMoving() {
        this.isMoving = true;
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.renderTimeout = setTimeout(() => {
            this.isMoving = false;
            this.render();
        }, this.renderDelay);
    }
    stopMoving() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.isMoving = false;
        this.render();
    }
    getCSSConfig() {
        const styleSource = document.documentElement || this.canvas
        const cs = window.getComputedStyle(styleSource);
 
        const getVar = (name, fallback) => {
            const val = cs.getPropertyValue(name)?.trim();
            return val && val !== '' ? val : fallback;
        }
        this.fontName = getVar('--font', 'Arial');
        this.fontColor = getVar('--axis', '#999999');
        this.colors.grid = getVar('--grid', '#e0e0e0');
        this.colors.gridLight = getVar('--grid-light', '#f5f5f5');
        this.colors.axis = getVar('--axis', '#999999');
        this.colors.axisLight = getVar('--axis-light', '#bbbbbb');
    }

    renderWhileMove() {
        this.getCSSConfig();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.drawGrid(true);
        this.canvas.style.filter = "blur(3px)";
        this.drawContent();
        this.ctx.restore();
    }
    render() {
        this.getCSSConfig();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.filter = "blur(0px)";
        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.drawGrid(false);
        this.drawContent();
        this.ctx.restore();
    }

    drawGrid(lightweight = false, targetPixel = 100) {
        this.getCSSConfig()
        const { grid, gridLight, axis, axisLight } = this.colors;
        const targetPixelSpacing =  (1 / this.pixelScale) + targetPixel; 
        const worldSpacing = targetPixelSpacing / this.camera.zoom;
        const magnitude = Math.pow(10, Math.floor(Math.log10(worldSpacing)));
        let gridSize;
        
        const ratio = worldSpacing / magnitude;
        if (ratio < 1.5) {
            gridSize = magnitude;
        } else if (ratio < 3.5) {
            gridSize = magnitude * 2;
        } else if (ratio < 7.5) {
            gridSize = magnitude * 5;
        } else {
            gridSize = magnitude * 10;
        }
        
        // Calcola i limiti visibili
        const startX = Math.floor(-this.camera.x / this.camera.zoom / gridSize) * gridSize;
        const startY = Math.floor(-this.camera.y / this.camera.zoom / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.camera.zoom) + gridSize;
        const endY = startY + (this.canvas.height / this.camera.zoom) + gridSize;

        // Griglia principale
        this.ctx.strokeStyle = lightweight ? gridLight : grid
        this.ctx.lineWidth = Math.min(0.1, 1 / this.camera.zoom)

        // Linee verticali
        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Linee orizzontali
        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }

        // Assi principali (più spessi)
        this.ctx.strokeStyle = lightweight ? axisLight : axis;
        this.ctx.lineWidth = Math.min(0.2,2 / this.camera.zoom)
        
        // Asse X
        this.ctx.beginPath();
        this.ctx.moveTo(startX, 0);
        this.ctx.lineTo(endX, 0);
        this.ctx.stroke();
        
        // Asse Y
        this.ctx.beginPath();
        this.ctx.moveTo(0, startY);
        this.ctx.lineTo(0, endY);
        this.ctx.stroke();
        
        if (!lightweight) {
            const fontSize = Math.max(10, Math.min(14, this.camera.zoom * 0.3))/ this.camera.zoom;
            this.ctx.fillStyle = this.fontColor;
            this.ctx.font = `${fontSize}px ${this.fontName}`;
            
            const decimals = this.getDecimalPlaces(gridSize);
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            for (let x = startX; x < endX; x += gridSize) {
                if (Math.abs(x) > gridSize * 0.001) {
                    const label = Math.abs(x) >= 1000000 ? x.toExponential(1) : x.toFixed(decimals);
                    this.ctx.fillText(label, x, 5 / this.camera.zoom);
                }
            }
            
            // Labels sull'asse Y
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';
            for (let y = startY; y < endY; y += gridSize) {
                if (Math.abs(y) > gridSize * 0.001) {
                    const val = -y;
                    const label = Math.abs(val) >= 1000000 ? val.toExponential(1) : val.toFixed(decimals);
                    this.ctx.fillText(label, -5 / this.camera.zoom, y);
                }
            }
            
            // Label origine
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('0', -5 / this.camera.zoom, 5 / this.camera.zoom);
        }
    }
    getDecimalPlaces(gridSize) {
        if (gridSize >= 1) return 0;
        return Math.min(10, Math.abs(Math.floor(Math.log10(gridSize))));
    }
    drawContent() {
        this.functions.forEach(funcData => {
            this.drawFunction(funcData.fn, funcData.color);
        });
    }
    drawFunction(fn, color = '#' + Math.floor(Math.random() * 16777215).toString(16)) {
        const lineWidth = this.pixelScale * 2
        const startX = -this.camera.x / this.camera.zoom;
        const endX = (this.canvas.width - this.camera.x) / this.camera.zoom;
        const pixelStep = 1 / this.pixelScale
        const worldStep = pixelStep / this.camera.zoom;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth / this.camera.zoom;
        this.ctx.beginPath();

        let isFirstPoint = true;
        let hasValidPoint = false;

        for (let x = startX; x <= endX; x += worldStep) {
            try {
                const y = fn(x);
                if (typeof y === 'number' && isFinite(y)) {
                    if (isFirstPoint) {
                        this.ctx.moveTo(x, -y);
                        isFirstPoint = false;
                    } else {
                        this.ctx.lineTo(x, -y);
                    }
                    hasValidPoint = true;
                } else {
                    if (hasValidPoint) {
                        this.ctx.stroke();
                        this.ctx.beginPath();
                        isFirstPoint = true;
                        hasValidPoint = false;
                    }
                }
            } catch (e) {
                if (hasValidPoint) {
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    isFirstPoint = true;
                    hasValidPoint = false;
                }
            }
        }

        if (hasValidPoint) {
            this.ctx.stroke();
        }
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.x) / this.camera.zoom,
            y: (screenY - this.camera.y) / this.camera.zoom
        };
    }
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.camera.zoom + this.camera.x,
            y: worldY * this.camera.zoom + this.camera.y
        };
    }
    resetView() {
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };
        this.render();
        this.zoomToOrigin(this.initialZoom)
    }

    addFunction(fn) {
        const lineWidth = 1 + (this.pixelScale * 2)
        const color = '#' + Math.floor(Math.random() * 16777215).toString(16)
        this.functions.push({
            fn,
            color,
            lineWidth
        });
        this.render();
        return this.functions.length - 1;
    }
    zoomToOrigin(newZoom = 50) {
        this.camera.x = this.canvas.width / 2;
        this.camera.y = this.canvas.height / 2;
        this.camera.zoom = newZoom;
        this.render();
    }
    removeFunction(index) {
        this.functions.splice(index, 1);
        this.render();
    }
    clearFunctions() {
        this.functions = [];
        this.render();
    }
}
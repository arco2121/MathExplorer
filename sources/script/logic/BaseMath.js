/*
You need to include math.js for this (https://mathjs.org/)
CSS Variables names in the :root

(BaseFormulasRender) For colors, set this CSS vars : 
    --grid: #ffffff87;
    --grid-light: #d2d2d285;
    --axis: #ffffff;
    --axis-light: #d2d2d2;
    --font: <fontname>

*/
/*Constants*/
const MathScope = {
    ...math,
    pi: Math.PI,
    e: Math.E
}
const reserved = [
    "sin", "cos", "tan", "log", "sqrt", "abs", 
    "pi", "e", "exp", "pow", "mod",
    "round", "min", "max", "floor", "ceil",
]

//Renderers
class BaseRender {
    constructor(canvas, zoomMax = 1e100, zoomMin = 1e-100, initialZoom = 100, sensitivity = 0.005, delayRender = 300) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1
        };
        this.isDragging = false;
        this.lastMousePos = {
            x: 0,
            y: 0
        };
        this.isMoving = false;
        this.renderTimeout = null;
        this.isRendering = false;
        this.isLoading = true;
        this.doRender = false

        this.colors = {}
        this.minZoom = zoomMin;
        this.maxZoom = zoomMax;
        this.initialZoom = initialZoom;
        this.zoomSensitivity = sensitivity;
        this.renderDelay = delayRender;
        this.setupCanvas();
        this.setupEventListeners();
        this.autoRender = setInterval(() => {
            if ((!this.isMoving || !this.renderTimeout) && this.doRender) this.render()
        }, this.renderDelay)

    }

    setupCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', e => this.onWheel(e), {
            passive: false
        });
        this.canvas.addEventListener('touchstart', e => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', e => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onTouchEnd());
        window.addEventListener('resize', () => this.setupCanvas());
        window.addEventListener('changed_theme', () => this.render());
        this.canvas.addEventListener("click", (e) => this.onClick(e))
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
        this.canvas.style.cursor = '';
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
        const worldX = (mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - this.camera.y) / this.camera.zoom;

        let deltaZoom = 1 - e.deltaY * this.zoomSensitivity;
        deltaZoom = Math.max(this.minZoom / this.camera.zoom, Math.min(deltaZoom, this.maxZoom / this.camera.zoom));

        const frames = 10;
        let step = 0;
        const startZoom = this.camera.zoom;
        const targetZoom = this.camera.zoom * deltaZoom;
        const animate = () => {
            step++;
            const progress = step / frames;
            this.camera.zoom = startZoom + (targetZoom - startZoom) * progress;
            this.camera.x = mouseX - worldX * this.camera.zoom;
            this.camera.y = mouseY - worldY * this.camera.zoom;
            this.renderWhileMove();
            if (step < frames) requestAnimationFrame(animate);
        };
        animate();
    }
    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        return [mx, my]
    }

    startMoving() {
        this.isMoving = true;
        if (this.renderTimeout) clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => {
            this.isMoving = false;
            this.render();
        }, this.renderDelay);
    }
    stopMoving() {
        if (this.renderTimeout) clearTimeout(this.renderTimeout);
        this.isMoving = false;
        this.render();
    }

    renderWhileMove(blurSize = 3) {
        this.isRendering = true;
        this.getCSSConfig();
        this.canvas.style.filter = "blur(" + blurSize + "px)"
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.drawContent()
        this.isRendering = false;
        this.isLoading = false;
        this.ctx.restore();
    }
    render() {
        this.isRendering = true;
        this.getCSSConfig();
        this.canvas.style.filter = ""
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.isRendering = false;
        this.isLoading = false;
        this.drawContent();
        this.ctx.restore();
    }

    drawContent() {}

    worldToScreen(x, y) {
        return {
            x: x * this.camera.zoom + this.camera.x,
            y: -y * this.camera.zoom + this.camera.y
        };
    }
    screenToWorld(x, y) {
        return {
            x: (x - this.camera.x) / this.camera.zoom,
            y: (y - this.camera.y) / this.camera.zoom
        };
    }

    resetView() {
        this.zoomToOrigin(this.initialZoom);
    }
    zoomToOrigin(newZoom = 50) {
        this.camera.x = this.canvas.width / 2;
        this.camera.y = this.canvas.height / 2;
        this.camera.zoom = newZoom;
        this.render();
    }

    zoomIn(factor = this.initialZoom / 25, fromOrigin = true) {
        this._zoomByFactor(factor, fromOrigin);
    }
    zoomOut(factor = this.initialZoom / 25, fromOrigin = true) {
        this._zoomByFactor(1 / factor, fromOrigin);
    }
    _zoomByFactor(factor, fromOrigin) {
        const centerX = fromOrigin ? this.canvas.width / 2 : 0;
        const centerY = fromOrigin ? this.canvas.height / 2 : 0;
        const worldX = this.screenToWorld(centerX, centerY).x;
        const startZoom = this.camera.zoom;
        const worldY = this.screenToWorld(centerX, centerY).y;
        this.camera.zoom = Math.min(Math.max(this.camera.zoom * factor, this.minZoom), this.maxZoom);
        const frames = 15;
        let step = 0;
        const targetZoom = this.camera.zoom
        const animate = () => {
            step++;
            const progress = step / frames;
            this.camera.zoom = startZoom + (targetZoom - startZoom) * progress;
            this.camera.x = centerX - worldX * this.camera.zoom;
            this.camera.y = centerY - worldY * this.camera.zoom;
            this.renderWhileMove();
            if (step < frames) requestAnimationFrame(animate);
        };
        animate();
        this.render();
    }
}
class BaseFormulasRender extends BaseRender {
    constructor(canvas, zoomMax = 1e100, zoomMin = 1e-100, initialZoom = 100, sensitivity = 0.005, delayRender = 200,
        pixelSize = 1) {
        super(canvas, zoomMax, zoomMin, initialZoom, sensitivity, delayRender)
        this.colors = {
            grid: '#e0e0e0',
            gridLight: '#f5f5f5',
            axis: '#999999',
            axisLight: '#bbbbbb'
        };
        this.pixelScale = pixelSize;
        this.formulas = []
        this.intersectionDots = []
        this.getCSSConfig();
        this.zoomToOrigin(this.initialZoom);
    }
    onClick(e) {
        const [x, y] = super.onClick(e)
        for (const dot of this.intersectionDots) {
            const dx = x - dot.x;
            const dy = y - dot.y;
            if (dx * dx + dy * dy <= dot.r * dot.r) {
                console.log(dot.x, dot.y)
                break;
            }
        }
    }
    getCSSConfig() {
        const cs = window.getComputedStyle(document.documentElement || this.canvas);
        const getVar = (name, fallback) => {
            const val = cs.getPropertyValue(name)?.trim();
            return val && val !== '' ? val : fallback;
        };
        this.font = getVar('--font', 'Arial');
        this.fontColor = getVar('--axis', '#999999');
        this.colors.grid = getVar('--grid', '#e0e0e0');
        this.colors.gridLight = getVar('--grid-light', '#f5f5f5');
        this.colors.axis = getVar('--axis', '#999999');
        this.colors.axisLight = getVar('--axis-light', '#bbbbbb');
    }

    renderWhileMove(blurSize = 3) {
        this.isRendering = true;
        this.getCSSConfig();
        this.canvas.style.filter = "blur(" + blurSize + "px)"
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.drawGrid(true);
        this.drawContent(false);
        this.isRendering = false;
        this.isLoading = false;
        this.ctx.restore();
    }
    render() {
        this.getCSSConfig();
        this.canvas.style.filter = ""
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.drawGrid(false);
        this.drawContent();
        this.isRendering = false;
        this.isLoading = false;
        this.ctx.restore();
    }

    drawGrid(lightweight = false, targetPixel = this.initialZoom, fontSize = targetPixel / (this.pixelScale * 7)) {
        const ctx = this.ctx;
        const {
            grid,
            gridLight,
            axis,
            axisLight
        } = this.colors;
        const targetSpacing = targetPixel / this.camera.zoom;
        const magnitude = Math.pow(10, Math.floor(Math.log10(targetSpacing)));
        let gridSize;
        const ratio = targetSpacing / magnitude;
        if (ratio < 1.5) gridSize = magnitude;
        else if (ratio < 3.5) gridSize = magnitude * 2;
        else if (ratio < 7.5) gridSize = magnitude * 5;
        else gridSize = magnitude * 10;

        const left = this.screenToWorld(0, 0).x;
        const right = this.screenToWorld(this.canvas.width, 0).x;
        const top = this.screenToWorld(0, 0).y;
        const bottom = this.screenToWorld(0, this.canvas.height).y;

        ctx.strokeStyle = lightweight ? gridLight : grid;
        ctx.lineWidth = 1;
        for (let x = Math.floor(left / gridSize) * gridSize; x < right; x += gridSize) {
            const sx = this.worldToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, this.canvas.height);
            ctx.stroke();
        }
        for (let y = Math.floor(top / gridSize) * gridSize; y < bottom; y += gridSize) {
            const sy = this.worldToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(this.canvas.width, sy);
            ctx.stroke();
        }

        const origin = this.worldToScreen(0, 0);
        ctx.strokeStyle = lightweight ? axisLight : axis;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(this.canvas.width, origin.y);
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, this.canvas.height);
        ctx.stroke();

        if (!lightweight) {
            ctx.fillStyle = this.fontColor;
            ctx.font = `${fontSize}px ${this.font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const decimals = (v) => {
                if (Math.abs(v) >= this.maxZoom || Math.abs(v) < this.minZoom) return 2;
                if (gridSize < 1) return Math.max(0, Math.ceil(-Math.log10(gridSize)));
                return 0;
            }
            for (let x = Math.floor(left / gridSize) * gridSize; x < right; x += gridSize) {
                if (Math.abs(x) < 1e-12) continue;
                const val = x;
                const label = (Math.abs(val) >= 1e6 || Math.abs(val) < 1e-3) ? val.toExponential(2) : val.toFixed(
                    decimals(val));
                ctx.fillText(label, this.worldToScreen(x, 0).x, origin.y + 2);
            }
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
            for (let y = Math.floor(top / gridSize) * gridSize; y < bottom; y += gridSize) {
                if (Math.abs(y) < 1e-12) continue;
                const val = y;
                const label = (Math.abs(val) >= 1e6 || Math.abs(val) < 1e-3) ? val.toExponential(2) : val.toFixed(
                    decimals(val));
                ctx.fillText(label, origin.x - 2, this.worldToScreen(0, y).y);
            }
        }
    }
    drawContent(wihtPoints = true) {
        this.formulas.forEach(f => {
            this.drawFunction(f, f.options.color)
            if (wihtPoints) this.drawIntersections(f, f.options.color, 1.5)
        })
    }
    drawFunction(fn, color = '#' + Math.floor(Math.random() * 16777215).toString(16)) {
        const ctx = this.ctx;
        const startX = this.screenToWorld(0, 0).x;
        const endX = this.screenToWorld(this.canvas.width, 0).x;
        const step = 1 / this.pixelScale / this.camera.zoom;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;
        for (let xA = startX; xA <= endX; xA += step) {
            let y;
            try {
                y = fn.evaluate({
                    x: xA
                });
            } catch (e) {
                y = NaN;
            }
            if (!isFinite(y)) {
                first = true;
                continue;
            }
            const p = this.worldToScreen(xA, y);
            if (first) {
                ctx.moveTo(p.x, p.y);
                first = false;
            } else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }
    drawIntersections(fn, color = '#' + Math.floor(Math.random() * 16777215).toString(16), increaseFactor = 1) {
        this.intersectionDots = []
        const ctx = this.ctx;
        const targetPixel = this.initialZoom;
        const targetSpacing = targetPixel / this.camera.zoom;
        const magnitude = Math.pow(10, Math.floor(Math.log10(targetSpacing)));
        let gridSize;
        const ratio = targetSpacing / magnitude;
        if (ratio < 1.5) gridSize = magnitude;
        else if (ratio < 3.5) gridSize = magnitude * 2;
        else if (ratio < 7.5) gridSize = magnitude * 5;
        else gridSize = magnitude * 10;
        const left = this.screenToWorld(0, 0).x;
        const right = this.screenToWorld(this.canvas.width, 0).x;
        const radiusPx = Math.max(2, Math.round(4 * (window.devicePixelRatio || 1))) * increaseFactor
        const strokePx = Math.max(1, Math.round(1 * (window.devicePixelRatio || 1))) * increaseFactor
        ctx.lineWidth = strokePx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let startX = Math.floor(left / gridSize) * gridSize;
        for (let xF = startX; xF <= right; xF += gridSize) {
            let y;
            try {
                y = fn.evaluate({
                    x: xF
                });
            } catch (e) {
                y = NaN;
            }

            const screenPos = this.worldToScreen(xF, y || 0);
            const onScreen = screenPos.x >= -radiusPx && screenPos.x <= this.canvas.width + radiusPx;

            if (!onScreen) continue;
            const isValid = Number.isFinite(y);
            let screenX, screenY;
            if (isValid) {
                const p = this.worldToScreen(xF, y);
                screenX = p.x;
                screenY = p.y;
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const delta = Math.max(gridSize * this.minZoom, this.minZoom);
                let yL = NaN,
                    yR = NaN;
                try {
                    yL = fn.evaluate({
                        x: xF - delta
                    });
                } catch (e) {
                    yL = NaN;
                }
                try {
                    yR = fn.evaluate({
                        x: xF - delta
                    })
                } catch (e) {
                    yR = NaN;
                }
                let chosenY = NaN;
                if (Number.isFinite(yL) && Number.isFinite(yR)) chosenY = (yL + yR) / 2;
                else if (Number.isFinite(yL)) chosenY = yL;
                else if (Number.isFinite(yR)) chosenY = yR;

                if (Number.isFinite(chosenY)) screenY = this.worldToScreen(xF, chosenY).y;
                else screenY = chosenY >= 0 ? 0 + radiusPx + 2 : this.canvas.height - radiusPx - 2;
                screenX = this.worldToScreen(xF, 0).x;
                screenY -= increaseFactor * 10
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = strokePx;
                ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
                ctx.stroke();
            }
            this.intersectionDots.push({
                x: screenX,
                y: screenY,
                r: radiusPx,
                fnX: xF,
                fnY: y,
                fn: fn,
                valid: isValid
            });
        }
    }

    addFormula(fn) {
        if (!(fn instanceof BaseFormula))
            return -1
        this.formulas.push(fn);
        this.render();
        return this.formulas.length - 1;
    }
    removeFormula(index) {
        this.formulas.splice(index, 1);
        this.render();
    }
    clearFormula() {
        this.formulas = [];
        this.render();
    }
}

//Objects
class BaseFormula {
    constructor(expr, options = {}, params = {}) {
        switch(typeof expr) 
        {
            case "function" : {
                this.mode = "js"
                break
            }
            case "string" : {
                if (!math) throw new Error("math.js non caricato")
                this.mode = "mathjs"
                break
            }
            default : {
                return -1
            }
        }
        this.options = options
        const allVars = this.extractParams(expr)
        this.paramsNames = allVars.filter(v => Object.keys(params).includes(v));
        this.params = {};
        this.paramsNames.forEach(p => {
            this.params[p] = params[p] ?? 1;
        })
        this.vars = allVars.filter(v => !this.paramsNames.includes(v));
        this.fn = this.build(expr)
    }

    extractParams(fn) {
        switch(this.mode)
        {
            case "js" : {
                const src = fn.toString()
                const match = src.match(/^[^(]*\(([^)]*)\)/);
                if (!match) return [];
                const inside = match[1].replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/gm, "")
                return inside.split(",").map(s => s.trim()).filter(s => s.length > 0).map(s => s.split("=")[0].trim());
            }
            case "mathjs" : {
                const reservedInternal = [...reserved, 'i']
                const matches = fn.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
                return [...matches.filter(v => !reservedInternal.includes(v))];
            }
        }
    }
    build(expr) {
        switch(this.mode) 
        {
            case "js" : { 
                const args = [...this.vars,...this.paramsNames]
                const extract = (fn) => {
                    const raw = fn.toString().trim();
                    const stripComments = s =>
                        s.replace(/\/\*[\s\S]*?\*\//g, "")
                        .replace(/\/\/.*$/gm, "");

                    const src = stripComments(raw);
                    let isBlock = false;
                    const concise = src.match(/=>\s*([^{}][\s\S]*)$/);
                    if (concise) {
                        return {
                            isBlock: false,
                            body: concise[1].trim().replace(/;$/, "")
                        };
                    }
                    const start = src.indexOf("{");
                    if (start !== -1) {
                        let depth = 0, end = -1;
                        for (let i = start; i < src.length; i++) {
                            if (src[i] === "{") depth++;
                            else if (src[i] === "}") {
                                depth--;
                                if (depth === 0) { end = i; break; }
                            }
                        }
                        if (end !== -1) {
                            const body = src.slice(start + 1, end).trim();
                            return {
                                isBlock: true,
                                body
                            };
                        }
                    }
                    return { isBlock: false, body: "" }
                }
                const { isBlock, body } = extract(expr)
                let final
                if (isBlock) {
                    final = new Function(...args, body);
                } else {
                    final = new Function(...args, "return (" + body + ");");
                }
                return final
            }
            case "mathjs" : {
                let str = expr.replace(/\s+/g, "").replace(/^y=/, "");
                const placeholders = new Map();
                reserved.forEach((word, idx) => {
                    const ph = `§${idx}§`;
                    placeholders.set(ph, word);
                    str = str.replace(new RegExp(word, 'g'), ph);
                })
                str = str.replace(/\)([0-9a-zA-Z(])/g, ')*$1').replace(/([0-9])([a-zA-Z(])/g, '$1*$2').replace(/([a-z])([a-z(])/gi, (m, p1, p2) => /[§0-9]/.test(m) ? m : `${p1}*${p2}`)
                placeholders.forEach((word, ph) => {
                    str = str.replace(new RegExp(ph.replace(/§/g, '\\§'), 'g'), word);
                })
                return math.compile(str);
            }
        }
    }

    evaluate(vars = {}) {
        switch(this.mode)
        {
            case "js" : {
                const allVars = {
                    ...vars,
                    ...this.params
                }
                const args = this.paramsNames.length > 0 ? this.paramsNames.map(name => allVars[name]) : Object.keys(vars).map(k => vars[k])
                return this.fn(...args)
            }
            case "mathjs" : {
                return this.fn.evaluate({
                    ...vars,
                    ...this.params
                })
            }
        }
    }
}
class BaseFractal {
    constructor(iterations, formula) {
        if (!(fn instanceof BaseFormula))
            throw new Error("Not a BaseFormula object")
        this.iterations = iterations
        this.formula = formula
    }

    iterate(x0, y0) {
        let x = 0,
            y = 0,
            i = 0;
        while ((x * x + y * y <= 4) && i < this.iterations) {
            [x, y] = this.formula.evaluate(x, y, x0, y0);
            i++;
        }
        return i;
    }
}

const BaseMath = {
    createRender: (canvas) => {
        return new BaseRender(canvas)
    },
    createFormulasRender: (canvas) => {
        return new BaseFormulasRender(canvas)
    },
    createBaseFormula: (expr, options = {}) => {
        return new BaseFormula(expr, options)
    },
    createParametricFormula: (expr, paramsMap, options = {}) => {
        return BaseFormula(expr, options, paramsMap)
    }
}
/*
For colors, set this CSS vars : 
    --grid: #ffffff87;
    --grid-light: #d2d2d285;
    --axis: #ffffff;
    --axis-light: #d2d2d2;
    --font: <fontname>

Or any other color with this variables names in the :root
*/
class BaseMathRender {
    constructor(canvas, zoomMax = 1e100, zoomMin = 1e-100, initialZoom = 100, sensitivity = 0.005, delayRender = 200, pixelSize = 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.isMoving = false;
        this.renderTimeout = null;

        this.colors = { grid: '#e0e0e0', gridLight: '#f5f5f5', axis: '#999999', axisLight: '#bbbbbb' };
        this.minZoom = zoomMin;
        this.maxZoom = zoomMax;
        this.initialZoom = initialZoom;
        this.zoomSensitivity = sensitivity;
        this.renderDelay = delayRender;
        this.pixelScale = pixelSize;
        this.functions = []
        this.intersectionDots = []

        this.setupCanvas();
        this.setupEventListeners();
        this.getCSSConfig();
        this.zoomToOrigin(this.initialZoom);
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
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('touchstart', e => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', e => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onTouchEnd());
        window.addEventListener('resize', () => this.setupCanvas());
        window.addEventListener('changed_theme', () => this.render());
        this.canvas.addEventListener("click", (e) => {
            const [x,y] = this.onClick(e)
            for(const dot of this.intersectionDots){
                const dx = x - dot.x;
                const dy = y - dot.y;
                if(dx*dx + dy*dy <= dot.r * dot.r){
                    console.log(dot.x,dot.y) //operation
                    break;
                }
            }
        })
    }

    onMouseDown(e) { this.isDragging = true; this.lastMousePos = { x: e.clientX, y: e.clientY }; this.canvas.style.cursor = 'grabbing'; }
    onMouseMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.camera.x += dx; this.camera.y += dy;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.startMoving(); this.renderWhileMove();
    }
    onMouseUp() { this.isDragging = false; this.canvas.style.cursor = ''; this.stopMoving(); }
    onTouchStart(e) { if (e.touches.length === 1) { this.isDragging = true; this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }
    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastMousePos.x;
            const dy = e.touches[0].clientY - this.lastMousePos.y;
            this.camera.x += dx; this.camera.y += dy;
            this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this.startMoving(); this.renderWhileMove();
        }
    }
    onTouchEnd() { this.isDragging = false; this.stopMoving(); }
    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - this.camera.y) / this.camera.zoom;

        let deltaZoom = 1 - e.deltaY * this.zoomSensitivity;
        deltaZoom = Math.max(this.minZoom/this.camera.zoom, Math.min(deltaZoom, this.maxZoom/this.camera.zoom));

        // Smooth zoom animation
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
            if(step < frames) requestAnimationFrame(animate);
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

    startMoving() { this.isMoving = true; if (this.renderTimeout) clearTimeout(this.renderTimeout); this.renderTimeout = setTimeout(() => { this.isMoving = false; this.render(); }, this.renderDelay); }
    stopMoving() { if (this.renderTimeout) clearTimeout(this.renderTimeout); this.isMoving = false; this.render(); }

    getCSSConfig() {
        const cs = window.getComputedStyle(document.documentElement || this.canvas);
        const getVar = (name, fallback) => { const val = cs.getPropertyValue(name)?.trim(); return val && val !== '' ? val : fallback; };
        this.font = getVar('--font', 'Arial');
        this.fontColor = getVar('--axis', '#999999');
        this.colors.grid = getVar('--grid', '#e0e0e0');
        this.colors.gridLight = getVar('--grid-light', '#f5f5f5');
        this.colors.axis = getVar('--axis', '#999999');
        this.colors.axisLight = getVar('--axis-light', '#bbbbbb');
    }

    renderWhileMove(blurSize = 3) {
        this.getCSSConfig();
        this.canvas.style.filter = "blur(" + blurSize + "px)"
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.drawGrid(true);
        this.drawContent(false);
        this.ctx.restore();
    }
    render() {
        this.getCSSConfig();
        this.canvas.style.filter = "blur(0px)"
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.drawGrid(false);
        this.drawContent();
        this.ctx.restore();
    }

    drawGrid(lightweight=false, targetPixel = this.initialZoom, fontSize = targetPixel/(this.pixelScale * 7)) {
        const ctx = this.ctx;
        const { grid, gridLight, axis, axisLight } = this.colors;
        const targetSpacing = targetPixel / this.camera.zoom;
        const magnitude = Math.pow(10, Math.floor(Math.log10(targetSpacing)));
        let gridSize;
        const ratio = targetSpacing / magnitude;
        if(ratio < 1.5) gridSize = magnitude;
        else if(ratio < 3.5) gridSize = magnitude*2;
        else if(ratio < 7.5) gridSize = magnitude*5;
        else gridSize = magnitude*10;

        const left = this.screenToWorld(0,0).x;
        const right = this.screenToWorld(this.canvas.width,0).x;
        const top = this.screenToWorld(0,0).y;
        const bottom = this.screenToWorld(0,this.canvas.height).y;

        ctx.strokeStyle = lightweight ? gridLight : grid;
        ctx.lineWidth = 1;
        for(let x = Math.floor(left/gridSize)*gridSize; x < right; x+=gridSize){
            const sx = this.worldToScreen(x,0).x;
            ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,this.canvas.height); ctx.stroke();
        }
        for(let y = Math.floor(top/gridSize)*gridSize; y < bottom; y+=gridSize){
            const sy = this.worldToScreen(0,y).y;
            ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(this.canvas.width,sy); ctx.stroke();
        }

        const origin = this.worldToScreen(0,0);
        ctx.strokeStyle = lightweight ? axisLight : axis;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(this.canvas.width, origin.y);
        ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, this.canvas.height); ctx.stroke();

        if(!lightweight){
            ctx.fillStyle = this.fontColor;
            ctx.font = `${fontSize}px ${this.font}`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';

            const decimals = (v) => {
                if(Math.abs(v) >= this.maxZoom || Math.abs(v) < this.minZoom) return 2;
                if(gridSize < 1) return Math.max(0, Math.ceil(-Math.log10(gridSize)));
                return 0;
            }
            for(let x = Math.floor(left/gridSize)*gridSize; x < right; x+=gridSize){
                if(Math.abs(x)<1e-12) continue;
                const val = x;
                const label = (Math.abs(val) >= 1e6 || Math.abs(val) < 1e-3) ? val.toExponential(2) : val.toFixed(decimals(val));
                ctx.fillText(label, this.worldToScreen(x,0).x, origin.y+2);
            }
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'
            for(let y = Math.floor(top/gridSize)*gridSize; y < bottom; y+=gridSize){
                if(Math.abs(y)<1e-12) continue;
                const val = -y;
                const label = (Math.abs(val) >= 1e6 || Math.abs(val) < 1e-3) ? val.toExponential(2) : val.toFixed(decimals(val));
                ctx.fillText(label, origin.x-2, this.worldToScreen(0,y).y);
            }
        }
    }
    drawContent(wihtPoints = true) { 
        this.functions.forEach(f => {
            this.drawFunction(f.fn,f.color)
            if(wihtPoints) this.drawIntersections(f.fn,f.color,2)
        }) 
    }
    drawFunction(fn, color = '#' + Math.floor(Math.random() * 16777215).toString(16)) {
        const ctx = this.ctx;
        const startX = this.screenToWorld(0,0).x;
        const endX = this.screenToWorld(this.canvas.width,0).x;
        const step = 1/this.pixelScale/this.camera.zoom;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let first = true;
        for(let x=startX; x<=endX; x+=step){
            let y; try { y = fn(x); } catch(e){ y = NaN; }
            if(!isFinite(y)){ first=true; continue; }
            const p = this.worldToScreen(x,y);
            if(first){ ctx.moveTo(p.x,p.y); first=false; } else ctx.lineTo(p.x,p.y);
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
        const radiusPx = Math.max(2, Math.round(4 * (window.devicePixelRatio || 1)));
        const strokePx = Math.max(1, Math.round(1 * (window.devicePixelRatio || 1)));
        ctx.lineWidth = strokePx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let startX = Math.floor(left / gridSize) * gridSize;
        for (let x = startX; x <= right; x += gridSize) {
            let y;
            try { y = fn(x); } catch (e) { y = NaN; }

            const screenPos = this.worldToScreen(x, y || 0);
            const onScreen = screenPos.x >= -radiusPx && screenPos.x <= this.canvas.width + radiusPx;

            if (!onScreen) continue;
            const isValid = Number.isFinite(y);
            let screenX, screenY;
            if(isValid){
                const p = this.worldToScreen(x, y);
                screenX = p.x;
                screenY = p.y;
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(screenX, screenY, radiusPx*increaseFactor, 0, Math.PI*2);
                ctx.fill();
            }else{
                const delta = Math.max(gridSize*this.minZoom, this.minZoom);
                let yL=NaN, yR=NaN;
                try { yL = fn(x-delta); } catch(e){yL=NaN;}
                try { yR = fn(x+delta); } catch(e){yR=NaN;}
                let chosenY = NaN;
                if(Number.isFinite(yL) && Number.isFinite(yR)) chosenY = (yL+yR)/2;
                else if(Number.isFinite(yL)) chosenY = yL;
                else if(Number.isFinite(yR)) chosenY = yR;

                if(Number.isFinite(chosenY)) screenY = this.worldToScreen(x, chosenY).y;
                else screenY = chosenY >=0 ? 0+radiusPx+2 : this.canvas.height-radiusPx-2;
                screenX = this.worldToScreen(x,0).x;

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = strokePx;
                ctx.arc(screenX, screenY, radiusPx, 0, Math.PI*2);
                ctx.stroke();
            }
            this.intersectionDots.push({x:screenX, y:screenY, r:radiusPx, fnX:x, fnY:y, fn:fn ,valid:isValid});
        }
    }

    worldToScreen(x,y){ return { x:x*this.camera.zoom+this.camera.x, y:y*this.camera.zoom+this.camera.y }; }
    screenToWorld(x,y){ return { x:(x-this.camera.x)/this.camera.zoom, y:(y-this.camera.y)/this.camera.zoom }; }

    resetView(){ this.zoomToOrigin(this.initialZoom); }
    zoomToOrigin(newZoom=50){ this.camera.x=this.canvas.width/2; this.camera.y=this.canvas.height/2; this.camera.zoom=newZoom; this.render(); }

    zoomIn(factor=this.initialZoom/25, fromOrigin=true){ this._zoomByFactor(factor, fromOrigin); }
    zoomOut(factor=this.initialZoom/25, fromOrigin=true){ this._zoomByFactor(1/factor, fromOrigin); }
    _zoomByFactor(factor, fromOrigin){
        const centerX = fromOrigin ? this.canvas.width/2 : 0;
        const centerY = fromOrigin ? this.canvas.height/2 : 0;
        const worldX = this.screenToWorld(centerX, centerY).x;
        const startZoom = this.camera.zoom;
        const worldY = this.screenToWorld(centerX, centerY).y;
        this.camera.zoom = Math.min(Math.max(this.camera.zoom*factor, this.minZoom), this.maxZoom);
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
            if(step < frames) requestAnimationFrame(animate);
        };
        animate();
        this.render();
    }

    addFunction(fn){ this.functions.push({fn, color:'#'+Math.floor(Math.random()*16777215).toString(16)}); this.render(); return this.functions.length-1; }
    removeFunction(index){ this.functions.splice(index,1); this.render(); }
    clearFunctions(){ this.functions=[]; this.render(); }
}
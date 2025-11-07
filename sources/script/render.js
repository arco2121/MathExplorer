const canvasGL = document.getElementById('rendering');
const canvasCPU = document.getElementById('renderingCPU');
const gl = canvasGL.getContext('webgl2', { antialias: true });
let vertSrc = null, fragSrc = null, program = null, posBuf = null;
let uResolution = null, uCam = null, uZoom = null, uJulia = null, uFlags = null, uIters = null, uType = null;
let cam_x = 0.0, cam_y = 0.0, cam_zoom = 100.0;
let cam_x_dest = 0.0, cam_y_dest = 0.0, cam_zoom_dest = 100.0;
let jx = 1e9, jy = 1e9, juliaActive = false;
let use_color = false, hide_orbit = false;
let normalized = true, sustain = true;
let frame = 0, max_iters = 1200, fractalType = 0;
let audioCtx = null, audioNode = null, audioRunning = false;
let usingCPURendering = true, customFractalFunc = null;

const resizeCanvas = () => {
    const w = Math.floor(window.innerWidth * devicePixelRatio);
    const h = Math.floor(window.innerHeight * devicePixelRatio);
    [canvasGL, canvasCPU].forEach(c => {
        c.width = w;
        c.height = h;
        c.style.width = window.innerWidth + 'px';
        c.style.height = window.innerHeight + 'px';
    });
};

const loadText = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error('load failed: ' + url);
    return await r.text();
};

const compileShader = (src, type) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(log);
    }
    return s;
};

const createProgram = (vsrc, fsrc) => {
    const vs = compileShader(vsrc, gl.VERTEX_SHADER);
    const fs = compileShader(fsrc, gl.FRAGMENT_SHADER);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(p);
        gl.deleteProgram(p);
        throw new Error(log);
    }
    return p;
};

const screenToPt = (x, y) => {
    const px = (x - canvasGL.width / 2) / cam_zoom - cam_x;
    const py = (y - canvasGL.height / 2) / cam_zoom - cam_y;
    return [px, py];
};

const buildGLSLFromFractalInstance = async (instance) => {
    const g = instance.toGLSL('fractalStep');
    const base = await loadText('../shaders/fragTemplate.glsl');
    return base.replace('__FRACTAL_FUNCTION__', g);
};

const startAudio = async () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        await audioCtx.audioWorklet.addModule('./synth-processor.js');
        audioNode = new AudioWorkletNode(audioCtx, 'WFractalSynth');
        audioNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    audioRunning = true;
    sendSynthParams();
};

const stopAudio = () => {
    if (!audioCtx) return;
    audioRunning = false;
    try {
        audioNode.port.postMessage({ type: 'pause' });
    } catch {}
    audioCtx.suspend();
};

const sendSynthParams = () => {
    if (!audioNode) return;
    audioNode.port.postMessage({ type: 'setParams', sustain, normalized, fractalType });
};

const setPoint = (x, y) => {
    if (!audioNode) return;
    audioNode.port.postMessage({ type: 'setPoint', x, y });
    audioNode.port.postMessage({ type: 'resume' });
};

const drawFractalCPU = () => {
    const ctx2d = canvasCPU.getContext('2d');
    const img = ctx2d.createImageData(canvasCPU.width, canvasCPU.height);
    const data = img.data;
    const maxItersLocal = Math.max(50, Math.min(max_iters, 1200));
    for (let py = 0; py < canvasCPU.height; ++py) {
        for (let px = 0; px < canvasCPU.width; ++px) {
            let x = (px - canvasCPU.width / 2) / cam_zoom - cam_x;
            let y = (py - canvasCPU.height / 2) / cam_zoom - cam_y;
            const cx = x, cy = y;
            let i = 0;
            while (i < maxItersLocal && (x * x + y * y) < 4.0) {
                try {
                    const out = customFractalFunc ? customFractalFunc(x, y, cx, cy) : [x * x - y * y + cx, 2 * x * y + cy];
                    x = out[0];
                    y = out[1];
                } catch {
                    break;
                }
                i++;
            }
            const col = i === maxItersLocal ? 0 : Math.floor(255 * i / maxItersLocal);
            const idx = (py * canvasCPU.width + px) * 4;
            data[idx] = col;
            data[idx + 1] = 100 + (col >> 1);
            data[idx + 2] = 255 - col;
            data[idx + 3] = 255;
        }
    }
    ctx2d.putImageData(img, 0, 0);
};

const takeScreenshot = () => {
    (usingCPURendering ? canvasCPU : canvasGL).toBlob((b) => {
        const reader = new FileReader();
        reader.onload = () => parent.postMessage({ cmd: 'screenshot', dataURL: reader.result }, '*');
        reader.readAsDataURL(b);
    });
};

const ensureAudioGesture = () => {
    if (!audioCtx) return startAudio();
    if (audioCtx.state === 'suspended') return audioCtx.resume();
    return Promise.resolve();
};

const loadFractal = async (fractalObj) => {
    const base = await loadText('./shaders/fragTemplate.glsl');
    const glsl = base.replace('__FRACTAL_FUNCTION__', fractalObj.toGLSL('fractalStep'));
    const newProg = createProgram(vertSrc, glsl);
    program = newProg;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uResolution = gl.getUniformLocation(program, 'iResolution');
    uCam = gl.getUniformLocation(program, 'iCam');
    uZoom = gl.getUniformLocation(program, 'iZoom');
    uJulia = gl.getUniformLocation(program, 'iJulia');
    uFlags = gl.getUniformLocation(program, 'iFlags');
    uIters = gl.getUniformLocation(program, 'iIters');
    uType = gl.getUniformLocation(program, 'iType');
    usingCPURendering = false;
    currentFractal = fractalObj;
};

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

(async () => {
    vertSrc = await loadText('./shaders/vert.glsl').catch(() => null);
    const fragTemplate = await loadText('./shaders/fragTemplate.glsl').catch(() => null);
    if (!vertSrc)
        vertSrc = `#version 300 es
        in vec2 a_position;
        void main(){ gl_Position = vec4(a_position, 0.0, 1.0); }`;
    if (!fragTemplate)
        throw new Error('Shader template not found: fragTemplate.glsl');
    const defaultFractal = new Fractal();
    const fragSrc = fragTemplate.replace('__FRACTAL_FUNCTION__', defaultFractal.toGLSL('fractalStep'));
    program = createProgram(vertSrc, fragSrc);
    gl.useProgram(program);
    posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    uResolution = gl.getUniformLocation(program, 'iResolution');
    uCam = gl.getUniformLocation(program, 'iCam');
    uZoom = gl.getUniformLocation(program, 'iZoom');
    uJulia = gl.getUniformLocation(program, 'iJulia');
    uFlags = gl.getUniformLocation(program, 'iFlags');
    uIters = gl.getUniformLocation(program, 'iIters');
    uType = gl.getUniformLocation(program, 'iType');
    await startAudio().catch(() => {});
    requestAnimationFrame(loop);
})();

let lastTime = performance.now();
const loop = (now) => {
    const dt = now - lastTime;
    lastTime = now;
    cam_zoom = cam_zoom * 0.82 + cam_zoom_dest * 0.18;
    cam_x = cam_x * 0.82 + cam_x_dest * 0.18;
    cam_y = cam_y * 0.82 + cam_y_dest * 0.18;
    if (usingCPURendering) {
        drawFractalCPU();
        requestAnimationFrame(loop);
        return;
    }
    gl.viewport(0, 0, canvasGL.width, canvasGL.height);
    gl.useProgram(program);
    if (uResolution) gl.uniform2f(uResolution, canvasGL.width, canvasGL.height);
    if (uCam) gl.uniform2f(uCam, cam_x, cam_y);
    if (uZoom) gl.uniform1f(uZoom, cam_zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(loop);
};

window.addEventListener('message', async (ev) => {
    const msg = ev.data;
    if (!msg) return;
    try {
        if (msg.cmd === 'setFractalObject' && msg.fractal) {
            const fractalObj = Fractal.fromJSON(msg.fractal);
            await loadFractal(fractalObj);
            parent.postMessage({ cmd: 'loadedFractalObject', success: true }, '*');
        } else if (msg.cmd === 'setFractalObjectDefault' && msg.fractal) {
            const fractalObj = defaultFractals[parseInt(msg.fractal) - 1];
            await loadFractal(fractalObj);
            parent.postMessage({ cmd: 'loadedFractalObject', success: true }, '*');
        } else if (msg.cmd === 'changeRender') {
            usingCPURendering = !usingCPURendering;
        }
    } catch (err) {
        parent.postMessage({ cmd: 'error', message: err.message }, '*');
    }
});

setInterval(() => {
    if (usingCPURendering) {
        canvasGL.style.display = 'none';
        canvasCPU.style.display = 'block';
    } else {
        canvasGL.style.display = 'block';
        canvasCPU.style.display = 'none';
    }
}, 100);

const handlePointerDownClient = (x, y, type) => {
    if (type === 'touch-hold-julia') {
        juliaActive = true;
        jx = (x - canvasGL.width / 2) / cam_zoom - cam_x;
        jy = (y - canvasGL.height / 2) / cam_zoom - cam_y;
    } else if (type === 'tap') {
        const [fx, fy] = screenToPt(x * devicePixelRatio, y * devicePixelRatio);
        ensureAudioGesture().then(() => {
            if (audioNode) setPoint(fx, fy);
        });
    } else if (type === 'drag-start') {
        dragging = true;
        prevDrag = [x, y];
    }
};

const registerCanvasEvents = (canvas) => {
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            const now = performance.now();
            if (now - lastTap < 300) tapCount++; else tapCount = 1;
            lastTap = now;
            if (tapCount === 2) { use_color = !use_color; return; }
            longPressTimer = setTimeout(() => { juliaActive = true; }, 500);
            handlePointerDownClient(e.clientX, e.clientY, 'drag-start');
            const [px, py] = screenToPt(e.clientX * devicePixelRatio, e.clientY * devicePixelRatio);
            setPoint(px, py);
        } else if (e.button === 1) {
            dragging = true;
            prevDrag = [e.clientX, e.clientY];
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        dragging = false;
        clearTimeout(longPressTimer);
        if (juliaActive && e.button === 0) juliaActive = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (dragging) {
            const cur = [e.clientX, e.clientY];
            cam_x_dest += (cur[0] - prevDrag[0]) / cam_zoom;
            cam_y_dest += (cur[1] - prevDrag[1]) / cam_zoom;
            prevDrag = cur;
            frame = 0;
        }
        if (juliaActive) {
            jx = (e.clientX - canvasGL.width / 2) / cam_zoom - cam_x;
            jy = (e.clientY - canvasGL.height / 2) / cam_zoom - cam_y;
        }
    });

    canvas.addEventListener('wheel', (e) => {
        cam_zoom_dest *= Math.pow(1.1, -Math.sign(e.deltaY));
    });

    canvas.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        const touches = ev.touches;
        if (touches.length === 1) {
            const t = touches[0];
            const now = performance.now();
            if (now - lastTap < 300) tapCount++; else tapCount = 1;
            lastTap = now;
            if (tapCount === 2) { use_color = !use_color; return; }
            longPressTimer = setTimeout(() => { juliaActive = true; }, 600);
            dragging = true;
            prevDrag = [t.clientX, t.clientY];
        } else if (touches.length === 2) {
            clearTimeout(longPressTimer);
            pinchStartDist = getTouchDistance(touches[0], touches[1]);
            pinchStartZoom = cam_zoom_dest;
        }
    });

    canvas.addEventListener('touchmove', (ev) => {
        ev.preventDefault();
        const touches = ev.touches;
        if (touches.length === 1) {
            const t = touches[0];
            if (dragging) {
                const cur = [t.clientX, t.clientY];
                cam_x_dest += (cur[0] - prevDrag[0]) / cam_zoom;
                cam_y_dest += (cur[1] - prevDrag[1]) / cam_zoom;
                prevDrag = cur;
                frame = 0;
            }
            if (juliaActive) {
                jx = (t.clientX - canvasGL.width / 2) / cam_zoom - cam_x;
                jy = (t.clientY - canvasGL.height / 2) / cam_zoom - cam_y;
            }
        } else if (touches.length === 2) {
            const d = getTouchDistance(touches[0], touches[1]);
            const scale = d / pinchStartDist;
            cam_zoom_dest = pinchStartZoom * scale;
        }
    });

    canvas.addEventListener('touchend', (ev) => {
        ev.preventDefault();
        clearTimeout(longPressTimer);
        const touches = ev.touches;
        if (touches.length === 0) {
            if (juliaActive) juliaActive = false;
            const now = performance.now();
            if (now - lastTap < 300) {
                const t = ev.changedTouches[0];
                if (t) {
                    const [fx, fy] = screenToPt(t.clientX * devicePixelRatio, t.clientY * devicePixelRatio);
                    ensureAudioGesture().then(() => {
                        if (audioNode) setPoint(fx, fy);
                    });
                }
            }
        } else if (touches.length === 1) {
            dragging = true;
            prevDrag = [touches[0].clientX, touches[0].clientY];
        }
    });
};

// Registra gli eventi su entrambi i canvas
registerCanvasEvents(canvasGL);
registerCanvasEvents(canvasCPU);
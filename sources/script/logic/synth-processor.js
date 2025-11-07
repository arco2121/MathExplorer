class WFractalSynth extends AudioWorkletProcessor {

    constructor() {
        super();
        this.customFractal = null;
        this.sampleRate = sampleRate;
        this.max_freq = 4000;
        this.AUDIO_BUFF_SIZE = 4096;
        this.steps = Math.max(1, Math.floor(this.sampleRate / this.max_freq));
        this.play_x = 0;
        this.play_y = 0;
        this.play_cx = 0;
        this.play_cy = 0;
        this.play_px = 0;
        this.play_py = 0;
        this.play_nx = 0;
        this.play_ny = 0;
        this.mean_x = 0;
        this.mean_y = 0;

        this.volume = 8000.0;
        this.audio_reset = true;
        this.audio_pause = false;
        this.normalized = true;
        this.sustain = true;
        this.type = 0;
        this.m_audio_time = 0;

        this._dx = 0;
        this._dy = 0;
        this._dpx = 0;
        this._dpy = 0;

        this.port.onmessage = (ev) => {
            const d = ev.data;
            if (!d) return;
            switch (d.type) {
                case 'setPoint':
                    this.play_nx = d.x;
                    this.play_ny = d.y;
                    this.audio_reset = true;
                    this.audio_pause = false;
                    break;
                case 'setParams':
                    if (d.sustain !== undefined) this.sustain = d.sustain;
                    if (d.normalized !== undefined) this.normalized = d.normalized;
                    if (d.fractalType !== undefined) this.type = d.fractalType | 0;
                    break;
                case 'pause':
                    this.audio_pause = true;
                    break;
                case 'resume':
                    this.audio_pause = false;
                    break;
                case 'setCustomFractal':
                    try {
                        this.customFractal = eval(d.func);
                    } catch (err) {
                        this.customFractal = null;
                        console.warn('Errore parsing frattale custom:', err);
                    }
                    break;
            }
        };
    }

    applyFractal(xy, cx, cy) {
        let x = xy[0],
            y = xy[1];
        if (this.type === -1 && typeof this.customFractal === 'function') {
            const res = this.customFractal(xy[0], xy[1], cx, cy);
            if (Array.isArray(res) && res.length === 2) {
                xy[0] = res[0];
                xy[1] = res[1];
            }
            return;
        }
        switch (this.type) {
            case 0:
                { const nx = x * x - y * y + cx; const ny = 2.0 * x * y + cy;xy[0] = nx;xy[1] = ny; break; }
            case 1:
                { const nx = x * x - y * y + cx; const ny = 2.0 * Math.abs(x * y) + cy;xy[0] = nx;xy[1] = ny; break; }
            case 2:
                {
                    const zx = x,
                        zy = y;
                    const nx = zx * zx * zx - 3.0 * zx * zy * zy;
                    const ny = 3.0 * zx * zx * zy - zy * zy * zy;
                    const denom = 1.0 + zx * zx + zy * zy;xy[0] = nx / denom + cx;xy[1] = ny / denom + cy;
                    break;
                }
            case 3:
                { const r2 = x * x + y * y;xy[0] = x * r2 - cx * cx;xy[1] = y * r2 - cy * cy; break; }
            case 4:
                { const nx = 1.0 - cx * x * x + y; const ny = cy * x;xy[0] = nx;xy[1] = ny; break; }
            case 5:
                { const nx = y; const ny = -cy * x + cx * y - y * y * y;xy[0] = nx;xy[1] = ny; break; }
            case 6:
                {
                    const t = 0.4 - 6.0 / (1.0 + x * x + y * y);
                    const st = Math.sin(t),
                        ct = Math.cos(t);
                    const nx = 1.0 + cx * (x * ct - y * st);
                    const ny = cy * (x * st + y * ct);xy[0] = nx;xy[1] = ny;
                    break;
                }
            case 7:
                { y += cy * Math.sin(x);x += cx * y;xy[0] = x;xy[1] = y; break; }
            default:
                { const nx = x * x - y * y + cx; const ny = 2.0 * x * y + cy;xy[0] = nx;xy[1] = ny; break; }
        }
    }

    process(inputs, outputs) {
        const outL = outputs[0][0];
        const outR = outputs[0][1] || outputs[0][0];

        if (this.audio_reset) {
            this.m_audio_time = 0;
            this.play_cx = this.play_nx || 0;
            this.play_cy = this.play_ny || 0;
            this.play_x = this.play_nx || 0;
            this.play_y = this.play_ny || 0;
            this.play_px = this.play_nx || 0;
            this.play_py = this.play_ny || 0;
            this.mean_x = this.play_nx || 0;
            this.mean_y = this.play_ny || 0;
            this.volume = 8000.0;
            this.audio_reset = false;
        }

        const blockSize = outL.length;
        for (let iSample = 0; iSample < blockSize; iSample++) {
            if (this.audio_pause) {
                outL[iSample] = 0;
                outR[iSample] = 0;
                continue;
            }

            const j = this.m_audio_time % this.steps;
            if (j === 0) {
                this.play_px = this.play_x;
                this.play_py = this.play_y;
                let tmp = [this.play_x, this.play_y];
                this.applyFractal(tmp, this.play_cx, this.play_cy);
                this.play_x = tmp[0];
                this.play_y = tmp[1];

                if (this.play_x * this.play_x + this.play_y * this.play_y > 1000.0) {
                    this.audio_pause = true;
                    outL[iSample] = 0;
                    outR[iSample] = 0;
                    continue;
                }

                let dx = 0,
                    dy = 0,
                    dpx = 0,
                    dpy = 0;
                if (this.normalized) {
                    dpx = this.play_px - this.play_cx;
                    dpy = this.play_py - this.play_cy;
                    dx = this.play_x - this.play_cx;
                    dy = this.play_y - this.play_cy;
                    const dpmag = 1.0 / Math.sqrt(1e-12 + dpx * dpx + dpy * dpy);
                    const dmag = 1.0 / Math.sqrt(1e-12 + dx * dx + dy * dy);
                    dpx *= dpmag;
                    dpy *= dpmag;
                    dx *= dmag;
                    dy *= dmag;
                } else {
                    dx = this.play_x - this.mean_x;
                    dy = this.play_y - this.mean_y;
                    dpx = this.play_px - this.mean_x;
                    dpy = this.play_py - this.mean_y;
                }

                this.mean_x = this.mean_x * 0.99 + this.play_x * 0.01;
                this.mean_y = this.mean_y * 0.99 + this.play_y * 0.01;

                let m = dx * dx + dy * dy;
                if (m > 2.0) {
                    dx *= 2.0 / m;
                    dy *= 2.0 / m;
                }
                m = dpx * dpx + dpy * dpy;
                if (m > 2.0) {
                    dpx *= 2.0 / m;
                    dpy *= 2.0 / m;
                }

                if (!this.sustain) this.volume *= 0.9992;

                this._dx = dx;
                this._dy = dy;
                this._dpx = dpx;
                this._dpy = dpy;
            }

            let t = (this.m_audio_time % this.steps) / this.steps;
            t = 0.5 - 0.5 * Math.cos(t * Math.PI);
            const wx = t * this._dx + (1.0 - t) * this._dpx;
            const wy = t * this._dy + (1.0 - t) * this._dpy;

            const sL = Math.max(-32000, Math.min(32000, wx * this.volume));
            const sR = Math.max(-32000, Math.min(32000, wy * this.volume));

            outL[iSample] = sL / 32768;
            outR[iSample] = sR / 32768;

            this.m_audio_time += 1;
        }

        return true;
    }
}

registerProcessor('WFractalSynth', WFractalSynth);
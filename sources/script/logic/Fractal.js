class Fractal {
    constructor(name = "", fn = null) {
        this._customSource = null;
        this._compiledFn = null;
        this._isValid = false;
        this.name = name
        if (fn) this.setFunction(fn);
        else this.setFunction(this._defaultStep);
    }

    _defaultStep(x, y, cx, cy) {
        return [x * x - y * y + cx, 2 * x * y + cy];
    }

    setFunction(fnOrStr) {
        if (typeof fnOrStr === 'function') {
            const test = fnOrStr(0, 0, 0, 0);
            if (!Array.isArray(test) || test.length !== 2)
                throw new Error('Fractal function must return [x, y]');
            this._compiledFn = fnOrStr;
            this._customSource = fnOrStr.toString();
            this._isValid = true;
        } else if (typeof fnOrStr === 'string') {
            if (!this._isSafeFunction(fnOrStr))
                throw new Error('Unsafe or invalid code');
            const fn = new Function('x', 'y', 'cx', 'cy', `return (${fnOrStr});`);
            const test = fn(0, 0, 0, 0);
            if (!Array.isArray(test) || test.length !== 2)
                throw new Error('Fractal function must return [x, y]');
            this._compiledFn = fn;
            this._customSource = fnOrStr;
            this._isValid = true;
        } else throw new Error('Invalid fractal source');
    }

    _isSafeFunction(code) {
        const forbidden =
            /\b(window|document|eval|Function|fetch|XMLHttpRequest|import|require|setTimeout|setInterval)\b/i;
        const allowed = /^[\s\S]*$/;
        return !forbidden.test(code) && allowed.test(code);
    }

    step(x, y, cx, cy) {
        if (!this._compiledFn) throw new Error('Fractal not initialized');
        return this._compiledFn(x, y, cx, cy);
    }

    _mapMathToGLSL(src) {
        const map = {
            'Math\\.sin': 'sin',
            'Math\\.cos': 'cos',
            'Math\\.tan': 'tan',
            'Math\\.abs': 'abs',
            'Math\\.pow': 'pow',
            'Math\\.sqrt': 'sqrt',
            'Math\\.exp': 'exp',
            'Math\\.log': 'log',
            'Math\\.floor': 'floor',
            'Math\\.ceil': 'ceil',
            'Math\\.min': 'min',
            'Math\\.max': 'max',
            'Math\\.atan2': 'atan',
            'Math\\.PI': '3.14159265',
            'Math\\.E': '2.7182818'
        };
        let out = src;
        for (const k in map) out = out.replace(new RegExp(k, 'g'), map[k]);
        out = out.replace(/%/g, 'mod');
        return out;
    }

    _normalizeNumbers(src) {
        return src.replace(/(\d+)(?![\.\d])/g, (m) =>
            m.indexOf('.') === -1 ? m + '.0' : m
        );
    }

    _extractBody(fnSrc) {
        const m = fnSrc.match(/\{([\s\S]*)\}$/);
        return m ? m[1].trim() : fnSrc;
    }

    buildGLSLBody() {
        let src = this._customSource || this._compiledFn.toString();
        src = src.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const body = this._extractBody(src);
        let s = body;
        s = s.replace(
            /return\s*\[\s*([\s\S]*?)\s*,\s*([\s\S]*?)\s*\]\s*;?/,
            (m, a, b) => {
                a = this._mapMathToGLSL(a.trim());
                b = this._mapMathToGLSL(b.trim());
                a = this._normalizeNumbers(a);
                b = this._normalizeNumbers(b);
                a = a.replace(/\bcx\b/g, 'c.x').replace(/\bcy\b/g, 'c.y');
                b = b.replace(/\bcx\b/g, 'c.x').replace(/\bcy\b/g, 'c.y');
                return `float nx = ${a}; float ny = ${b};`;
            }
        );
        s = s.replace(/var\s+|let\s+|const\s+/g, '');
        s = this._mapMathToGLSL(s);
        return s;
    }

    toGLSL(funcName = 'fractalStep') {
        const header = `vec2 ${funcName}(vec2 z, vec2 c) {
            float x = z.x;
            float y = z.y;
            float cx = c.x;
            float cy = c.y;
        `;
        const body = this.buildGLSLBody();
        const footer = ` return vec2(nx, ny); }`;
        return `${header} ${body} ${footer}`;
    }

    toJSON() {
        return JSON.stringify({
            type: 'Fractal',
            name: this.name,
            source: this._customSource,
            valid: this._isValid
        });
    }

    static fromJSON(jsonStr) {
        const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!obj || obj.type !== 'Fractal' || !obj.source)
            throw new Error('Invalid Fractal JSON');
        return new Fractal(obj.name, obj.source);
    }

    getSource() {
        return this._customSource || this._compiledFn?.toString() || '';
    }
}

const defaultFractals = [
    new Fractal((x, y, cx, cy) => [x * x - y * y + cx, 2 * x * y + cy]),
    new Fractal((x, y, cx, cy) => [x * x - y * y + cx, 2 * Math.abs(x * y) + cy]),
    new Fractal((x, y, cx, cy) => [Math.sin(x * cx) - Math.cos(y * cy), 2 * x * y + cy]),
    new Fractal((x, y, cx, cy) => [x * x * x - 3 * x * y * y + cx, 3 * x * x * y - y * y * y + cy]),
    new Fractal((x, y, cx, cy) => [1 - cx * x * x + y, cy * x]),
    new Fractal((x, y, cx, cy) => [y, -cy * x + cx * y - y * y * y]),
    new Fractal((x, y, cx, cy) => {
        const r2 = x * x + y * y;
        return [x * r2 - cx * cx, y * r2 - cy * cy];
    }),
    new Fractal((x, y, cx, cy) => [y + cy * Math.sin(x), x + cx * y])
]

window.Fractal = Fractal;
window.defaultFractals = defaultFractals
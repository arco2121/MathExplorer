#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 iResolution;
uniform vec2 iCam;
uniform float iZoom;
uniform vec2 iJulia;
uniform int iFlags;
uniform int iIters;
uniform int iType;
uniform float iTime;

vec2 screenToPt(vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution) / iZoom;
    p -= iCam;
    return p;
}

__FRACTAL_FUNCTION__

float palette(float t) {
    return t;
}

void main() {
    vec2 uv = gl_FragCoord.xy;
    vec2 p = screenToPt(uv);
    vec2 c = ((iFlags & 2) != 0) ? iJulia : p;
    vec2 z = p;

    int i = 0;
    for (; i < iIters; ++i) {
        z = fractalStep(z, c);
        if (dot(z, z) > 1000.0) break;
    }

    float t = float(i) / float(iIters);
    vec3 col = vec3(smoothstep(0.0, 1.0, t));

    if ((iFlags & 4) != 0)
        col = vec3(t, 0.5 * t, 1.0 - t);

    col *= 0.5 + 0.5 * sin(0.0005 * iTime + vec3(0.0, 2.0, 4.0));
    outColor = vec4(col, 1.0);
}
#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_mixRatio;
uniform sampler2D u_texture1; // background
uniform sampler2D u_texture2; // foreground

uniform vec2 u_canvasResolution;
uniform vec2 u_tex1Resolution;
uniform vec2 u_tex2Resolution;

vec2 aspectFillUV(vec2 uv, vec2 texRes, vec2 canvasRes) {
    float sx = canvasRes.x / texRes.x;
    float sy = canvasRes.y / texRes.y;
    float s = max(sx, sy);                // <-- max for cover
    vec2 displaySize = texRes * s;
    vec2 offset = (canvasRes - displaySize) * 0.5f;
    return (uv * canvasRes - offset) / displaySize;
}

void main() {
    // Background (aspect-fill)
    vec2 uv1 = aspectFillUV(v_uv, u_tex1Resolution, u_canvasResolution);
    vec4 color1 = vec4(0.0f);
    if(all(greaterThanEqual(uv1, vec2(0.0f))) && all(lessThanEqual(uv1, vec2(1.0f)))) {
        color1 = texture(u_texture1, uv1);
    }

    float fgScale = 0.8f;

    vec2 centeredUV = v_uv - 0.5f;
    vec2 scaledUV = centeredUV / fgScale + 0.5f;
    vec2 uv2 = (scaledUV * u_canvasResolution - (u_canvasResolution - u_tex2Resolution * min(u_canvasResolution.x / u_tex2Resolution.x, u_canvasResolution.y / u_tex2Resolution.y)) * 0.5f) / (u_tex2Resolution * min(u_canvasResolution.x / u_tex2Resolution.x, u_canvasResolution.y / u_tex2Resolution.y));

    vec4 color2 = vec4(0.0f);
    if(all(greaterThanEqual(uv2, vec2(0.0f))) && all(lessThanEqual(uv2, vec2(1.0f)))) {
        color2 = texture(u_texture2, uv2);
    }

    fragColor = mix(color1, color2, 1.0f);
}
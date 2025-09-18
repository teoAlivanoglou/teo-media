#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

void main() {
    fragColor = vec4(v_uv.x, v_uv.y, 0.0f, 1.0f);
}
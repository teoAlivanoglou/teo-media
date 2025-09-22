#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture0;
uniform vec2 u_canvasResolution;

void main() {
    fragColor = texture(u_texture0, v_uv);
}
#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform float u_mixRatio;

void main() {
    vec4 bg = texture(u_texture0, v_uv);
    vec4 fg = texture(u_texture1, v_uv);
    fragColor = mix(bg, fg, u_mixRatio);
}
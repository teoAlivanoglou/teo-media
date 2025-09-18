#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_inputTexture;

void main() {
    fragColor = texture(u_inputTexture, v_uv);
}
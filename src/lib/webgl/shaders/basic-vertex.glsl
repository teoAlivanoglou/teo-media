#version 300 es

in vec2 a_position;
out vec2 v_uv;

void main() {
    gl_Position = vec4(a_position, 0.0f, 1.0f);
    v_uv = (a_position + 1.0f) * 0.5f;
}
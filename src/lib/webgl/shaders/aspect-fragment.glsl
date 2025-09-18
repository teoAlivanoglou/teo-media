#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_texResolution;   // width/height of the texture
uniform vec2 u_canvasResolution; // width/height of the canvas

void main() {
    // compute scale to preserve aspect ratio
    float sx = u_canvasResolution.x / u_texResolution.x;
    float sy = u_canvasResolution.y / u_texResolution.y;
    float s = min(sx, sy); // fit inside canvas
    vec2 displaySize = u_texResolution * s;

    // offset to center
    vec2 offset = (u_canvasResolution - displaySize) * 0.5f;

    // convert canvas UV to texture UV
    vec2 texUV = (v_uv * u_canvasResolution - offset) / displaySize;

    fragColor = vec4(1.0f, 0.0f, 0.0f, 1.0f);
    //texture(u_texture, texUV);
}

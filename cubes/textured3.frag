precision mediump float;

uniform vec4 uColor;
uniform sampler2D uSampler;
uniform bool uUseTexture;

varying vec2 vTexCoord;

void main () {
  if (uUseTexture) {
    gl_FragColor = texture2D(uSampler, vTexCoord);
  } else {
    gl_FragColor = uColor;
  }
}


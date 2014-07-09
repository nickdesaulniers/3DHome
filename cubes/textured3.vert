attribute vec4 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

varying vec2 vTexCoord;

void main () {
  gl_Position = uProjection * uView * uModel * aPosition;
  vTexCoord = aTexCoord;
}


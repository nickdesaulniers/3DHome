var canvas = document.getElementById('canvas');
var shaders = ['textured.vert', 'textured.frag'];
var images = [];
WebGLShaderLoader.load(canvas, shaders, images, function (errors, gl, programs, _) {
  if (errors.length) return console.error.apply(console, errors);

  var program = programs[0].program;
  var attributes = programs[0].attributes;
  var uniforms = programs[0].uniforms;

  gl.useProgram(program);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  var numIndices = addCube(gl, attributes);

  var locations = [
    transformMatrix(-0.5, 0.5),
    transformMatrix(-0.5, 0.0),
    transformMatrix(-0.5, -0.5),
    transformMatrix(0.5, 0.5),
    transformMatrix(0.5, 0.0),
    transformMatrix(0.5, -0.5)
  ];
  gl.uniform4f(uniforms.uColor, 1.0, 0.0, 0.0, 1.0);
  var d = degPerPeriod(10);
  var previous = performance.now();
  requestAnimationFrame(function anim (now) {
    var delta = now - previous; // ms
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (var i = 0; i < locations.length; ++i) {
      var location = locations[i];
      // rotate 360 deg in 10s
      // 360 deg / 10 s = 36 deg / s / 1000 ms / s = 0.0036 deg / ms
      mat4.rotateZ(location, location, deg2Rad(d * delta) * (i % 2 ? 1 : -1));
      gl.uniformMatrix4fv(uniforms.uMVP, false, location);
      // UNSIGNED_BYTE because indices is an Uint8Array
      gl.drawElements(gl.LINE_LOOP, numIndices, gl.UNSIGNED_BYTE, 0);
    }
    previous = now;
    requestAnimationFrame(anim);
  });
});

function addCube (gl, attributes) {
  // xyz triples for 1 vertex
  var vertices = new Float32Array([
    // x,    y,    z
     1.0,  1.0,  1.0, // v0 right top front
    -1.0,  1.0,  1.0, // v1 left top front
    -1.0, -1.0,  1.0, // v2 left bottom front
     1.0, -1.0,  1.0, // v3 right bottom front
     1.0, -1.0, -1.0, // v4 right bottom back
     1.0,  1.0, -1.0, // v5 right top back
    -1.0,  1.0, -1.0, // v6 left top back
    -1.0, -1.0, -1.0  // v7 left bottom back
  ]);
  var bpe = vertices.BYTES_PER_ELEMENT;
  // the pairs of vertex triples
  // 3 vertices = 1 triangle
  // 2 triangles = 1 quad = 1 face
  var indices = new Uint8Array([
    0, 1, 2,  0, 2, 3, // front
    0, 3, 4,  0, 4, 5, // right
    0, 5, 6,  0, 6, 1, // top
    1, 6, 7,  1, 7, 2, // left
    7, 4, 3,  7, 3, 2, // bottom
    4, 7, 6,  4, 6, 5  // back
  ]);

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) return console.error('unable to create vertex buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attributes.aPosition, 3, gl.FLOAT, false, 3 * bpe, 0);
  gl.enableVertexAttribArray(attributes.aPosition);

  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) return console.error('unable to create index buffer');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
};

function transformMatrix (x, y) {
  var matrix = mat4.create();

  mat4.translate(matrix, matrix, vec3.fromValues(x, y, 0.0));
  mat4.scale(matrix, matrix, vec3.fromValues(0.1, 0.1, 0.1));
  mat4.rotateY(matrix, matrix, Math.PI / 4);
  mat4.rotateX(matrix, matrix, Math.PI / 4);

  return matrix;
};

function deg2Rad (deg) { return Math.PI * deg / 180; };
function degPerPeriod (period) { return 0.36 / period; };


var canvas = document.getElementById('canvas');
var shaders = ['textured3.vert', 'textured2.frag'];
var images = ['r.jpg', 'r.jpg', 'r.jpg'];
images = images.concat(images);
images = images.concat(images);
WebGLShaderLoader.load(canvas, shaders, images, function (errors, gl, programs, imgs) {
  if (errors.length) return console.error.apply(console, errors);

  var program = programs[0].program;
  var attributes = programs[0].attributes;
  var uniforms = programs[0].uniforms;

  gl.useProgram(program);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  var aspectRatio = canvas.clientWidth / canvas.clientHeight;
  var numIndices = addCube(gl, attributes);

  var locations = createTransformMatrices(images.length, aspectRatio);
  var d = degPerPeriod(10); // 10s to rotate 360 deg
  var previous = performance.now();
  setUniforms(gl, uniforms, aspectRatio, imgs);

  requestAnimationFrame(function anim (now) {
    var delta = now - previous; // ms
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (var i = 0; i < locations.length; ++i) {
      var location = locations[i];
      // rotate 360 deg in 10s
      // 360 deg / 10 s = 36 deg / s / 1000 ms / s = 0.0036 deg / ms
      mat4.rotateZ(location, location, deg2Rad(d * delta) * (i % 2 ? 1 : -1));
      gl.uniformMatrix4fv(uniforms.uModel, false, location);
      // UNSIGNED_BYTE because indices is an Uint8Array
      gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_BYTE, 0);
    }
    previous = now;
    requestAnimationFrame(anim);
  });
});

function addCube (gl, attributes) {
  // xyz triples for 1 vertex
  var vertices = new Float32Array([
    // x,    y,    z                              u, v
     1.0,  1.0,  1.0, /* v0 right top front */    1.0, 1.0,
    -1.0,  1.0,  1.0, /* v1 left top front */     0.0, 1.0,
    -1.0, -1.0,  1.0, /* v2 left bottom front */  0.0, 0.0,
     1.0, -1.0,  1.0, /* v3 right bottom front */ 1.0, 0.0,
     // u's switch for back faces
     1.0, -1.0, -1.0, /* v4 right bottom back */  0.0, 0.0,
     1.0,  1.0, -1.0, /* v5 right top back */     0.0, 1.0,
    -1.0,  1.0, -1.0, /* v6 left top back */      1.0, 1.0,
    -1.0, -1.0, -1.0, /* v7 left bottom back */   1.0, 0.0
  ]);
  var bpe = vertices.BYTES_PER_ELEMENT;
  // the pairs of vertex triples
  // 3 vertices = 1 triangle
  // 2 triangles = 1 quad = 1 face
  var indices = new Uint8Array([
    0, 1, 2,  0, 2, 3, // front
    0, 3, 4,  0, 4, 5, // right
    //0, 5, 6,  0, 6, 1, // top
    1, 6, 7,  1, 7, 2, // left
    //7, 4, 3,  7, 3, 2, // bottom
    4, 7, 6,  4, 6, 5  // back
  ]);

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) return console.error('unable to create vertex buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.vertexAttribPointer(attributes.aPosition, 3, gl.FLOAT, false, 5 * bpe, 0);
  gl.enableVertexAttribArray(attributes.aPosition);

  gl.vertexAttribPointer(attributes.aTexCoord, 2, gl.FLOAT, false, 5 * bpe, 3 * bpe);
  gl.enableVertexAttribArray(attributes.aTexCoord);

  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) return console.error('unable to create index buffer');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
};

function createTransformMatrices (n, aspectRatio) {
  var matrices = [];
  var x, y;
  var space = 2.0 / (Math.ceil(n / 2) + 1);
  for (var i = 0; i < n; ++i) {
    x = aspectRatio * (i % 2 ? 0.5 : -0.5);
    y = 1 - Math.floor(i / 2) * space - space;
    matrices.push(transformMatrix(x, y));
  }

  return matrices;
};

function transformMatrix (x, y) {
  var matrix = mat4.create();

  mat4.translate(matrix, matrix, vec3.fromValues(x, y, 0.0));
  mat4.scale(matrix, matrix, vec3.fromValues(0.1, 0.1, 0.1));
  mat4.rotateY(matrix, matrix, Math.PI / 4);
  mat4.rotateX(matrix, matrix, Math.PI / 4);

  return matrix;
};

function setUniforms (gl, uniforms, aspectRatio, images) {
  gl.uniform4f(uniforms.uColor, 1.0, 0.0, 0.0, 1.0);
  var view = mat4.create();
  var eye = vec3.fromValues(0, 0, 5);
  var lookAt = vec3.fromValues(0, 0, 0);
  var up = vec3.fromValues(0, 1, 0);
  mat4.lookAt(view, eye, lookAt, up);
  gl.uniformMatrix4fv(uniforms.uView, false, view);
  var projection = mat4.create();
  mat4.perspective(projection, deg2Rad(30), aspectRatio, 1, 10);
  gl.uniformMatrix4fv(uniforms.uProjection, false, projection);

  // initialize textures
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uniforms.uSampler, 0);
  // sample textures
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[0]);
};

function deg2Rad (deg) { return Math.PI * deg / 180; };
function degPerPeriod (period) { return 0.36 / period; };


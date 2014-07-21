var canvas = document.getElementById('canvas');
var shaders = ['textured3.vert', 'textured3.frag'];
var images = ['r.jpg', 'Star.png', 'sicp.jpg'];
WebGLShaderLoader.load(canvas, shaders, images, function (errors, gl, programs, imgs) {
  if (errors.length) return console.error.apply(console, errors);

  var program = programs[0].program;
  var attributes = programs[0].attributes;
  var uniforms = programs[0].uniforms;

  var clearAlpha = 1.0;
  var clickAlpha = 0.0;
  if (clearAlpha === clickAlpha) throw new Error('pick handling would fail');

  gl.useProgram(program);
  gl.clearColor(0.0, 0.0, 0.0, clearAlpha);
  gl.enable(gl.DEPTH_TEST);

  var aspectRatio = canvas.clientWidth / canvas.clientHeight;
  var numIndices = addCube(gl, attributes);

  var d = degPerPeriod(10); // 10s to rotate 360 deg
  var previous = performance.now();
  setUniforms(gl, uniforms, aspectRatio, imgs);

  initializeTextures(gl, uniforms);

  var started = false;
  var ended = false;
  var savedIndex = NaN;
  var clickX, clickY;

  loadIcons(function (icons) {
    var images = icons ? icons : imgs;
    var locations = createTransformMatrices(images.length, aspectRatio);

    requestAnimationFrame(function anim (now) {
      var delta = now - previous; // ms
      previous = now;
      requestAnimationFrame(anim);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // pick detection
      if (started || ended) {
        gl.uniform1i(uniforms.uUseTexture, false);
        var step = 1.0 / locations.length; // will fail eventually with too many apps
        for (var j = 0; j < locations.length; ++j) {
          var location = locations[j];
          gl.uniformMatrix4fv(uniforms.uModel, false, location);
          gl.uniform4f(uniforms.uColor, j * step, 0.0, 0.0, clickAlpha);
          gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_BYTE, 0);
        }
        gl.uniform1i(uniforms.uUseTexture, true);

        // read pixels
        var pixels = new Uint8Array(4);
        gl.readPixels(clickX, clickY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (pixels[3] === clickAlpha) {
          var index = Math.round(pixels[0] / 255 / step);
          // if started. save index
          // else launch
          if (started) {
            // (170/255)/(1/3) if step is 1/3
            savedIndex = index;
          } else if (index === savedIndex) {
            console.log('launching apps[' + savedIndex + ']');
            savedIndex = NaN;
          }
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        started = ended = false;
      }
      for (var i = 0; i < locations.length; ++i) {
        var location = locations[i];
        // rotate 360 deg in 10s
        // 360 deg / 10 s = 36 deg / s / 1000 ms / s = 0.0036 deg / ms
        var s = (i % 4).toString(2);
        mat4.rotateZ(location, location, deg2Rad(d * delta) * (s[0] ^ s[1] ? 1 : -1));
        gl.uniformMatrix4fv(uniforms.uModel, false, location);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
        // UNSIGNED_BYTE because indices is an Uint8Array
        gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_BYTE, 0);
      }
    });
  });

  function setXY (e) {
    var rect = e.target.getBoundingClientRect();
    clickX = e.clientX - rect.left | 0;
    clickY = e.target.clientHeight - e.clientY + rect.top | 0;
    if (e.type === 'mousedown') {
      started = true;
    } else {
      ended = true;
    }
  };
  function setXYTouch (e) {
    for (var i = 0; i < e.changedTouches.length; ++i) {
      var touch = e.changedTouches[i];
      if (touch.identifier === 0) {
        var rect = e.target.getBoundingClientRect();
        clickX = touch.clientX - rect.left | 0;
        clickY = e.target.clientHeight - touch.clientY + rect.top | 0;
        if (e.type === 'touchstart') {
          started = true;
        } else {
          ended = true;
        }
      }
    }
  };
  // Did we start the touch on an app?
  // launch iff we ended on the same app
  if (!!('ontouchstart' in window)) {
    canvas.addEventListener('touchstart', setXYTouch);
    canvas.addEventListener('touchend', setXYTouch);
  } else {
    canvas.addEventListener('mousedown', setXY);
    canvas.addEventListener('mouseup', setXY);
  }
});

function addCube (gl, attributes) {
  // have to use 24 vertices, see:
  // http://stackoverflow.com/questions/24662924/can-an-element-array-buffer-be-used-for-texture-mapping-the-same-texture-on-a-ev/
  var vertices = new Float32Array([
    // x,    y,    z,   u,   v
    // front face (z: +1)
     1.0,  1.0,  1.0, 1.0, 1.0, // top right
    -1.0,  1.0,  1.0, 0.0, 1.0, // top left
    -1.0, -1.0,  1.0, 0.0, 0.0, // bottom left
     1.0, -1.0,  1.0, 1.0, 0.0, // bottom right
    // right face (x: +1)
     1.0,  1.0, -1.0, 1.0, 1.0, // top right
     1.0,  1.0,  1.0, 0.0, 1.0, // top left
     1.0, -1.0,  1.0, 0.0, 0.0, // bottom left
     1.0, -1.0, -1.0, 1.0, 0.0, // bottom right
    // top face (y: +1)
     1.0,  1.0, -1.0, 1.0, 1.0, // top right
    -1.0,  1.0, -1.0, 0.0, 1.0, // top left
    -1.0,  1.0,  1.0, 0.0, 0.0, // bottom left
     1.0,  1.0,  1.0, 1.0, 0.0, // bottom right
    // left face (x: -1)
    -1.0,  1.0,  1.0, 1.0, 1.0, // top right
    -1.0,  1.0, -1.0, 0.0, 1.0, // top left
    -1.0, -1.0, -1.0, 0.0, 0.0, // bottom left
    -1.0, -1.0,  1.0, 1.0, 0.0, // bottom right
    // bottom face (y: -1)
     1.0, -1.0,  1.0, 1.0, 1.0, // top right
    -1.0, -1.0,  1.0, 0.0, 1.0, // top left
    -1.0, -1.0, -1.0, 0.0, 0.0, // bottom left
     1.0, -1.0, -1.0, 1.0, 0.0, // bottom right
    // back face (x: -1)
    -1.0,  1.0, -1.0, 1.0, 1.0, // top right
     1.0,  1.0, -1.0, 0.0, 1.0, // top left
     1.0, -1.0, -1.0, 0.0, 0.0, // bottom left
    -1.0, -1.0, -1.0, 1.0, 0.0  // bottom right
  ]);

  // the pairs of vertex triples
  // 3 vertices = 1 triangle
  // 2 triangles = 1 quad = 1 face
  var indices = new Uint8Array([
     0,  1,  2,   0,  2,  3,
     4,  5,  6,   4,  6,  7,
     8,  9, 10,   8, 10, 11,
    12, 13, 14,  12, 14, 15,
    16, 17, 18,  16, 18, 19,
    20, 21, 22,  20, 22, 23
  ]);

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) return console.error('unable to create vertex buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var bpe = vertices.BYTES_PER_ELEMENT;
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
  gl.uniform1i(uniforms.uUseTexture, true);
};

function initializeTextures (gl, uniforms) {
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(uniforms.uSampler, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
};

function loadIcons (cb) {
  if (!navigator.mozApps || !navigator.mozApps.mgmt) {
    console.error('no mozApps.mgmt');
    return cb(null);
  }
  navigator.mozApps.mgmt.getAll().onsuccess = function (e) {
    var icons = [];
    var apps = e.target.result;
    var numToLoad = apps.length;
    apps.forEach(function (app, i) {
      // app manifest has no icons key
      if (!app.manifest.icons) {
        --numToLoad;
        return;
      }
      var largestIcon = Math.max.apply(null, Object.keys(app.manifest.icons));
      var imgSrc = app.installOrigin + app.manifest.icons[largestIcon];

      var xhr = new XMLHttpRequest({ mozSystem: true });
      xhr.open('GET', imgSrc);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () {
        if (xhr.status !== 200) {
          --numToLoad;
          if (icons.length === numToLoad) cb(icons);
          return;
        }
        // TODO: bad check this
        var blob = new Blob([xhr.response], { type: 'image/png' });
        var url = URL.createObjectURL(blob);
        var img = new Image;
        img.src = url;
        icons.push(img);
        if (icons.length === numToLoad) cb(icons);
      };
      try {
        xhr.send();
      } catch (e) {
        --numToLoad;
        if (icons.length === numToLoad) cb(icons);
      }
    });
  };
};

function deg2Rad (deg) { return Math.PI * deg / 180; };
function degPerPeriod (period) { return 0.36 / period; };


var mgmt = navigator.mozApps.mgmt;
mgmt.getAll().onsuccess = function (e) {
  var apps = e.target.result;
  console.log(apps);
  apps.forEach(function (app) {
    if (!app.manifest.icons) return;
    var largestIcon = Math.max.apply(null, Object.keys(app.manifest.icons));
    var imgSrc = app.installOrigin + app.manifest.icons[largestIcon];
    console.log(imgSrc);
    var img = new Image;
    img.width = img.height = '64';
    img.src = imgSrc;
    img.onclick = function (e) {
      console.log(e.target.src);
      app.launch();
    };
    document.body.appendChild(img);
  });
};


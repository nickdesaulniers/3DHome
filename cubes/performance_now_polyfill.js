// https://gist.github.com/paulirish/5438650
(function () {
  if (typeof window.performance === 'undefined') {
    window.performance = {};
  }
  if (!window.performance.now){
    var nowOffset = Date.now();
    if (performance.timing && performance.timing.navigationStart){
      nowOffset = performance.timing.navigationStart;
    }
    window.performance.now = function now(){
      return Date.now() - nowOffset;
    }
  }
})();


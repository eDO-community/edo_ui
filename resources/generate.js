var fs = require('fs');
var imagemagick = require('imagemagick');

var resize = function (item) {
  return new Promise(function(resolve, reject) {
    try {
        if (fs.existsSync(item.dst)) {
          if(fs.statSync(item.src).mtime <= fs.statSync(item.dst).mtime){
            resolve();
            return;
          }
        }

        imagemagick.crop({
            srcPath: item.src,
            dstPath: item.dst,
            quality: 1,
            format: item.dst.replace(/.*\.(\w+)$/i, '$1').toLowerCase(),
            width: item.width,
            height: item.height,
        }, function (err, stdout, stderr) {
            if (err) {
              console.log('Failed to generate ' + item.dst);
              reject('Failed to generate ' + item.dst);
            } else {
              console.log(item.dst + ' created');
              resolve(item.dst + ' created');
            }
        });
    } catch (error) {
      reject('Failed to generate ' + item.dst);
    }
  });
};

let queue = [];
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-hdpi-icon.png', width:72, height:72});
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-ldpi-icon.png', width:36, height:36});
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-mdpi-icon.png', width:48, height:48});
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-xhdpi-icon.png', width:96, height:96});
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-xxhdpi-icon.png', width:144, height:144});
queue.push({src:'resources/icon.png', dst:'resources/android/icon/drawable-xxxhdpi-icon.png', width:192, height:192});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-hdpi-screen.png', width:800, height:480});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-ldpi-screen.png', width:320, height:240});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-mdpi-screen.png', width:480, height:320});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-xhdpi-screen.png', width:1280, height:720});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-xxhdpi-screen.png', width:1600, height:960});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-land-xxxhdpi-screen.png', width:1920, height:1280});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-hdpi-screen.png', width:480, height:800});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-ldpi-screen.png', width:240, height:320});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-mdpi-screen.png', width:320, height:480});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-xhdpi-screen.png', width:720, height:1280});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-xxhdpi-screen.png', width:960, height:1600});
queue.push({src:'resources/splash.png', dst:'resources/android/splash/drawable-port-xxxhdpi-screen.png', width:1280, height:1920});

var promise = Promise.resolve(0);

queue.forEach(function(e){
  promise = promise.then(function(){
    return resize(e);
  });
});

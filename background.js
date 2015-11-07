var canvas;

chrome.extension.onRequest.addListener(function (request, sender, callback) {
  if (request.msg === 'capturePart'){
    cropVisible(request, sender, callback);
  }
});

function cropVisible(data, sender, callback) {
  canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;

  chrome.tabs.captureVisibleTab(
    null, {format: 'png', quality: 100}, function (dataURI) {
      if (dataURI) {
        var image = new Image();
        image.onload = function () {
          canvas.getContext('2d').drawImage(image, data.left+1, data.top+1, data.width, data.height, 0, 0, data.width, data.height);
          openPage(data);
          callback(true);
        };
        image.src = dataURI;
      }
    });
}


function openPage(data) {
  var dataURI = canvas.toDataURL();

  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], {type: mimeString});
  var size = blob.size + (1024 / 2);
  var name = data.url.split('?')[0].split('#')[0];
  if (name) {
    name = name
      .replace(/^https?:\/\//, '')
      .replace(/[^A-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[_\-]+/, '')
      .replace(/[_\-]+$/, '');
    name = '-' + name;
  } else {
    name = '';
  }
  name = 'screencapture' + name + '-' + Date.now() + '.png';

  function onwriteend() {
    var url = 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name;
    var image = {link: url, size: {width: data.width, height: data.height}};
    localStorage.currentCaptureImage = JSON.stringify(image);
    var images = JSON.parse(localStorage.images || '[]');
    images.push(image);
    localStorage.images = JSON.stringify(images);
  }

  window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
    fs.root.getFile(name, {create: true}, function (fileEntry) {
      fileEntry.createWriter(function (fileWriter) {
        fileWriter.onwriteend = onwriteend
        fileWriter.write(blob);
      });
    });
  });
}
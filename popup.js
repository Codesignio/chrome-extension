document.getElementById('takeScreenshot').addEventListener('click', takeScreenshoot);
document.getElementById('takeFullPageScreenshot').addEventListener('click', takeFullPageScreenShoot);

function takeScreenshoot(e) {
  chrome.tabs.captureVisibleTab(null, null, function(dataUrl) {
    var el = document.createElement('img');
    el.setAttribute('src', dataUrl);
    el.onclick = function(){
      chrome.tabs.create({url: dataUrl});
    };
    document.getElementById('images').appendChild(el);
  });
};

function takeFullPageScreenShoot(){
  chrome.tabs.getSelected(null, function(tab) {
      var loaded = false;
      document.getElementById('progressBar').style.display = 'block';
      chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function() {
        loaded = true;
        sendScrollMessage(tab);
      });
  });
}

var screenshot, contentURL = '';

function sendScrollMessage(tab) {
  contentURL = tab.url;
  screenshot = {};
  chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function() {
    openPage();
  });
}

chrome.extension.onRequest.addListener(function(request, sender, callback) {
  if (request.msg === 'capturePage') {
    capturePage(request, sender, callback);
  }
});


function capturePage(data, sender, callback) {
  var canvas;

  document.getElementById('progressBar').style.width = parseInt(data.complete * 100, 10) + '%';

  var scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ?
  1 / data.devicePixelRatio : 1;
  if (scale !== 1) {
    data.x = data.x / scale;
    data.y = data.y / scale;
    data.totalWidth = data.totalWidth / scale;
    data.totalHeight = data.totalHeight / scale;
  }
  if (!screenshot.canvas) {
    canvas = document.createElement('canvas');
    canvas.width = data.totalWidth;
    canvas.height = data.totalHeight;
    screenshot.canvas = canvas;
    screenshot.ctx = canvas.getContext('2d');
  }

  chrome.tabs.captureVisibleTab(
      null, {format: 'png', quality: 100}, function(dataURI) {
        if (dataURI) {
          var image = new Image();
          image.onload = function() {
            screenshot.ctx.drawImage(image, data.x, data.y);
            callback(true);
          };
          image.src = dataURI;
        }
      });
}

function openPage() {

  var dataURI = screenshot.canvas.toDataURL();

  var byteString = atob(dataURI.split(',')[1]);
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  var blob = new Blob([ab], {type: mimeString});
  var size = blob.size + (1024/2);
  var name = contentURL.split('?')[0].split('#')[0];
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
    var el = document.createElement('img');
    el.setAttribute('src', url);
    el.onclick = function(){
      chrome.tabs.create({url: url});
    };
    document.getElementById('images').appendChild(el);
    document.getElementById('progressBar').style.display = 'none';
  }

  window.webkitRequestFileSystem(window.TEMPORARY, size, function(fs){
    fs.root.getFile(name, {create: true}, function(fileEntry) {
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = onwriteend;
        fileWriter.write(blob);
      });
    });
  });
}

var canvas;
var screenshot;
var sendedrequest;
var capturedImage;
var token;

import {request} from './app/utils';
import {s3Upload} from './app/utils';
import {dataURItoBlob} from './app/utils';



chrome.extension.onRequest.addListener(function (request, sender, callback) {
  if (request.msg === 'capturePart'){
    cropVisible(request, sender, callback);
  } else if (request.msg === 'capturePage') {
    capturePage(request, sender, callback);
  } else if (request.msg === 'takeFullPageScreenshoot'){
    sendedrequest = request;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
        sendScrollMessage(tab);
      });
    });
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg === 'takeFullPageScreenshoot'){
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
          sendScrollMessage(tab);
        });
      });
    } else if (request.msg === 'token'){
      token = request.token
    };
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
  var capturedImageSize;
  var dataURI;
  if (screenshot){
    dataURI = screenshot.canvas.toDataURL();
    capturedImageSize = {width: screenshot.canvas.width, height: screenshot.canvas.height};
  } else {
    dataURI = canvas.toDataURL();
  }

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
    capturedImage = {link: url, size: capturedImageSize || {width: data.width, height: data.height}, url: data.url.split('?')[0]};

    if (sendedrequest){
      uploadImageAndPins();
    } else {
      localStorage.currentCaptureImage = JSON.stringify(capturedImage);
      var images = JSON.parse(localStorage.images || '[]');
      images.push(capturedImage);
      localStorage.images = JSON.stringify(images);
      chrome.runtime.sendMessage({msg: 'captured', capturedImage: capturedImage});
      chrome.browserAction.setBadgeText({text: capturedImageSize ? '': 'done'});
    }
    canvas = null;
    screenshot = null;
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

function sendScrollMessage(tab) {
  screenshot = {};
  chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
    openPage({url: tab.url});
  });
}


function capturePage(data, sender, callback) {
  var progressStatus = parseInt(data.complete * 100, 10) + '%';
  chrome.runtime.sendMessage({msg: 'progress', progress: progressStatus});
  chrome.browserAction.setBadgeText({text: progressStatus});

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
    null, {format: 'png', quality: 100}, function (dataURI) {
      if (dataURI) {
        var image = new Image();
        image.onload = function () {
          screenshot.ctx.drawImage(image, data.x, data.y);
          callback(true);
        };
        image.src = dataURI;
      }
    });
}


function uploadImageAndPins(){;

  var folders;
  request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
    folders = data1.results;

    request('http://api.codesign.io/folders/'+ folders[0].id + '/boards/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
      title: sendedrequest.pageTitle
    }, function (data) {
      uploadImageProcess(data.id, data.client_code);
    });
  })


}

function logProgress(percent){
  chrome.browserAction.setBadgeText({text: percent+'%'});
}

function uploadImageProcess(activeBoard, boardCode)
{
  var link = capturedImage.link;

  request('http://api.codesign.io/boards/' + activeBoard + '/posts/', 'POST', {
    "Authorization": 'Token ' + token,
    "Content-Type": "application/json;charset=UTF-8"
  }, {
    title: capturedImage.url + " " + (new Date).toString()
  }, function (data) {
    console.log(data);
    request('http://api.codesign.io/posts/' + data.id + '/images/get_upload_url/?filename=' + capturedImage.name + '&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
      console.log(data1);

      window.webkitResolveLocalFileSystemURL(link, function (fileEntry) {
        fileEntry.file(function (file) {
          s3Upload(data1.image_upload_url, file, logProgress, function (data2) {

            var canvas = document.createElement('canvas');
            canvas.width = 250;
            canvas.height = 150;
            var image = new Image();
            image.onload = function () {
              canvas.getContext('2d').drawImage(image, 0, 0, this.width, this.height, 0, 0, 250, 150);

              var blob = dataURItoBlob(canvas.toDataURL());
              s3Upload(data1.thumbnail_upload_url, blob, logProgress, function () {

                request('http://api.codesign.io/posts/' + data.id + '/images/', 'POST', {
                  "Authorization": 'Token ' + token,
                  "Content-Type": "application/json;charset=UTF-8"
                }, {
                  image_upload_url: data1.image_upload_url,
                  thumbnail_upload_url: data1.thumbnail_upload_url,
                  width: capturedImage.size.width,
                  height: capturedImage.size.height
                }, function (data3) {

                  var reqCount = 0;

                  for (var i = 0; i < sendedrequest.pins.length;i++) {
                    var pin = sendedrequest.pins[i];
                    request('http://api.codesign.io/posts/' + data.id + '/tasks/', 'POST', {
                      "Authorization": 'Token ' + token,
                      "Content-Type": "application/json;charset=UTF-8"
                    }, {
                      marker: {
                        geometry: {
                          left: pin.x/capturedImage.size.width * 100,
                          top: pin.y/capturedImage.size.height * 100
                        },
                        measure: 'pixel',
                        shape: "PN"
                      },
                      title: pin.text
                    }, function (data3) {
                      reqCount++;
                      if (reqCount == sendedrequest.pins.length){
                        chrome.tabs.create({url: 'http://www.codesign.io/board/' + boardCode});
                        chrome.browserAction.setBadgeText({text: ''});
                        capturedImage = null;
                        sendedrequest = null;
                      }

                    });
                  }

                });

              });

            };
            image.src = link;

          });
        });
      });


    });

  });
}
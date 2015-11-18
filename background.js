var screenshot = {};
var sendedrequest = {};
var cropData = null;
var startOauth;

import {request} from './app/utils';
import {s3Upload} from './app/utils';
import {dataURItoBlob} from './app/utils';

chrome.contextMenus.create({
  "title": "Add Comment",
  "contexts": ["page"],
  "onclick" : clickHandler
});

 function clickHandler(e) {
   chrome.tabs.getSelected(null, function (tab) {
     chrome.tabs.executeScript(tab.id, {code: 'window.codesign = {me: '+ localStorage.me+'}'}, function () {
       chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
         chrome.tabs.sendRequest(tab.id, {msg: 'contextMenu'}, function () {
         });
       });
     });

   });
 }



chrome.runtime.onInstalled.addListener(function(){
  chrome.tabs.create({'url': 'http://www.codesign.io/checkauthorization'}, function (tab) {});
});


chrome.extension.onRequest.addListener(function (request, sender, callback) {
  if (request.msg === 'capturePage') {
    capturePage(request, sender, callback);
  } else if (request.msg === 'cropData'){
    cropData = request;
    localStorage.currentAction = 'crop';
    chrome.browserAction.setBadgeText({text: 'crop'});
  } else if (request.msg == 'addPin'){
    sendedrequest = request;
    localStorage.currentAction = 'comment';
    chrome.browserAction.setBadgeText({text: request.pins.length.toString() });
  } else if (request.msg == 'cancelCrop'){
    cropData = null;
    localStorage.currentAction = '';
    chrome.browserAction.setBadgeText({text: ''});
  }  else if (request.msg == 'checkStartOauth'){
    callback(startOauth);
  } else if (request.msg == 'stopOauth'){
    if (request.token){
      localStorage.token = request.token;
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.remove(tab.id);
        chrome.tabs.create({'url': chrome.extension.getURL('login-sucessfully.html')}, function (tab) {});
      })
    } else {
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.update(tab.id, {url: chrome.extension.getURL('login.html')})
      })
    }
    startOauth = null;
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg === 'takeFullPageScreenshot'){
      takeFullPageScreenshot();
    } else if(request.msg === 'takeVisiblePageScreenshot'){
      takeVisibleScreenshot();
    } else if (request.msg == 'uploadImages'){
      uploadImages(request, sender, sendResponse)
    } else if (request.msg == 'startOauth'){
      startOauth = true;
    }
  });


function takeFullPageScreenshot(){
  chrome.tabs.getSelected(null, function (tab) {
    chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
      chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
        screenshotCaptured(screenshot, tab.url)
      });
    });
  });
}


function takeVisibleScreenshot(){
  captureVisible(function(canvas){
    chrome.tabs.getSelected(null, function (tab) {
      screenshotCaptured({canvas: canvas}, tab.url)
    })
  })
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
    screenshot.canvas = document.createElement('canvas');
    screenshot.canvas.width = data.totalWidth;
    screenshot.canvas.height = data.totalHeight;
  }

  captureVisible(function(){
    callback(true);
  }, {left: data.x, top: data.y})
}




function captureVisible(callBack, canvasPos){
  chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100}, function (dataURI) {

    if (dataURI) {
      var image = new Image();
      image.onload = function () {


        if(screenshot.canvas) {
          screenshot.canvas.getContext('2d').drawImage(image, canvasPos.left, canvasPos.top);
          callBack();
        } else {
          var capturedImageSize = {width: this.width, height: this.height, left: 0, top: 0};
          if(cropData) capturedImageSize = cropData;

          var canvas = document.createElement('canvas');
          canvas.width = capturedImageSize.width;
          canvas.height = capturedImageSize.height;
          canvas.getContext('2d').drawImage(image, capturedImageSize.left, capturedImageSize.top, capturedImageSize.width, capturedImageSize.height, 0, 0, capturedImageSize.width, capturedImageSize.height);

          callBack(canvas);
          console.log(canvas);
        }
      };
      image.src = dataURI;
    }
  })
}

function storeFromDataCanvas(canvas, pageUrl, callBack){
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


  var name = pageUrl.split('?')[0].split('#')[0];
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
  var url = 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name;

  window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
    fs.root.getFile(name, {create: true}, function (fileEntry) {
      fileEntry.createWriter(function (fileWriter) {
        fileWriter.onwriteend = () => callBack(url);
        fileWriter.write(blob);
      });
    });
  });
}


function screenshotCaptured(screenshot, pageUrl){
  console.log(screenshot);
  storeFromDataCanvas(screenshot.canvas, pageUrl, function(fileUrl){

    var capturedImage = {
      link: fileUrl,
      size: {width: screenshot.canvas.width, height: screenshot.canvas.height},
      url: pageUrl.split('?')[0],
      pins: sendedrequest.pins,
      pageTitle: sendedrequest.pageTitle
    };

    var capturedImages = JSON.parse(localStorage.capturedImages || '[]');
    var images = JSON.parse(localStorage.images || '[]');
    images.push(capturedImage);
    capturedImages.push(capturedImage);
    localStorage.capturedImages = JSON.stringify(capturedImages);
    localStorage.images = JSON.stringify(images);
    chrome.runtime.sendMessage({msg: 'captured', capturedImage: capturedImage});
    screenshot.canvas = null;
    sendedrequest = {};
    cropData = null;


  });
}










function uploadImages(req, sender, sendResponse){
  var token = localStorage.token;
  var activeBoard = req.activeBoard;
  var activeFolder = req.activeFolder;
  var posts = [];

  function logCallBack(value){
    chrome.runtime.sendMessage({msg: 'progress', progress: value})
  }


  if(activeBoard.id == 'new_board'){
    request('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
      title: "New Board"
    }, function (data) {
      activeBoard = data;
      uploadImageProcess(activeBoard,posts, logCallBack);
    });

  } else {

    request('http://api.codesign.io/boards/' + activeBoard.id + '/posts/', 'GET', {"Authorization": 'Token ' + token}, null, function (data) {
      posts = data.results;
      uploadImageProcess(activeBoard,posts, logCallBack);
    });
  }
}

function uploadImageProcess(activeBoard,posts, logCallBack){

  var token = localStorage.token;
  var capturedImages = JSON.parse(localStorage.capturedImages);

  var capImgCount=0;
  capturedImages.forEach(function(capturedImage){

    request('http://api.codesign.io/boards/'+ activeBoard.id + '/posts/', 'POST', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {
      title: capturedImage.url + " " + (new Date).toString()
    }, function (data) {
      console.log(data);
      request('http://api.codesign.io/posts/'+ data.id + '/images/get_upload_url/?filename='+ capturedImage.name +'&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
        console.log(data1);

        window.webkitResolveLocalFileSystemURL(capturedImage.link, function(fileEntry){
          console.log('fillllle');
          fileEntry.file(function(file) {
            s3Upload(data1.image_upload_url, file, logCallBack, function (data2) {

              var canvas = document.createElement('canvas');
              canvas.width = 250;
              canvas.height = 150;
              var image = new Image();
              image.onload = function () {
                canvas.getContext('2d').drawImage(image, 0,0, this.width, this.height, 0,0, 250,150);

                var blob =  dataURItoBlob(canvas.toDataURL());
                s3Upload(data1.thumbnail_upload_url, blob, logCallBack, function () {

                  request('http://api.codesign.io/posts/'+ data.id +'/images/', 'POST', {
                    "Authorization": 'Token ' + token,
                    "Content-Type": "application/json;charset=UTF-8"
                  }, {
                    image_upload_url:data1.image_upload_url,
                    thumbnail_upload_url: data1.thumbnail_upload_url,
                    width: capturedImage.size.width,
                    height: capturedImage.size.height
                  }, function (data3) {

                    request('http://api.codesign.io/boards/'+ activeBoard.id + '/update_order/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8"}, {
                      keys: posts.map((post)=> post.id).concat(data.id)
                    }, function () {


                      if(capturedImage.pins){

                        var reqCount = 0;
                        for (var i = 0; i < capturedImage.pins.length;i++) {
                          var pin = capturedImage.pins[i];
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
                            if (reqCount == capturedImage.pins.length){

                              capImgCount++;

                              if(capImgCount == capturedImages.length){
                                window.open("http://www.codesign.io/board/" + activeBoard.client_code);
                                chrome.browserAction.setBadgeText({text: ''});
                                localStorage.capturedImages = '[]';
                              }

                            }

                          });
                        }


                      } else {

                        capImgCount++;

                        if(capImgCount == capturedImages.length){
                          window.open("http://www.codesign.io/board/" + activeBoard.client_code);
                          chrome.browserAction.setBadgeText({text: ''});
                          localStorage.capturedImages = '[]';
                        }

                      }


                    });

                  });

                });

              };
              image.src = capturedImage.link;

            });
          });
        });


      });

    });
  })


}
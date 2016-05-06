var screenshot = {};
var sendedrequest = {};
var cropData = null;
var startOauth;
var cancelRequest;
var firstAuthorization;


const {track, CoIntercom } = require('./analitics');
const httprequest = require('./../utils').request;
const {dataURItoBlob} = require('./../utils');
const genRunner = require('../genrunner');



chrome.runtime.onInstalled.addListener(function(){
  chrome.tabs.create({'url': 'http://dev0.codesign.io/checkauthorization'}, function (tab) {});
});

chrome.runtime.setUninstallURL('http://dev0.codesign.io/uninstalled');


chrome.runtime.onMessage.addListener(function(request, sender, callback) {

  genRunner(function* () {

    if (request.msg === 'capturePage') {
      if (!cancelRequest) {
        yield* capturePage(request, sender, callback)
      } else {
        console.log('cancel');
      }
    }


    if (request.msg === 'cropData'){
      cropData = request;
      localStorage.currentAction = 'crop';
      chrome.browserAction.setBadgeText({text: 'share'});
    }


    if (request.msg == 'cancelCrop'){
      cropData = null;
      localStorage.currentAction = '';
      chrome.browserAction.setBadgeText({text: ''});
    }


    if (request.msg == 'checkStartOauth'){
      callback(startOauth);
    }


    if (request.msg == 'stopOauth'){
      console.log('stopOauth');
      if (request.token){
        localStorage.token = request.token;
        chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.remove(tab.id);

          !firstAuthorization && chrome.tabs.create({'url': 'http://www.codesign.io/extension-successfully-installed'}, function (tab) {});
          var token = localStorage.token;
          httprequest('http://api.codesign.io/users/me/', 'GET', {"Authorization": 'Token ' +  token}, null, function (data) {
            localStorage.me = JSON.stringify(data);
            CoIntercom.boot(data.user.id, data.user.first_name, data.user.date_joined);
            CoIntercom.loggedIn({login_type: request.urlProvider ? request.urlProvider : 'email'});
          });

          if (!request.fromSite) chrome.tabs.create({'url': 'http://www.codesign.io/syncauthorization', selected: false}, function (tab) {});
        })
      } else {
        chrome.tabs.getSelected(null, function (tab) {
          firstAuthorization = true;
          localStorage.firstAuthorization = 'true';
          chrome.tabs.update(tab.id, {url: 'http://www.codesign.io/chrome?extension-authorization'})
        })
      }
      startOauth = null;
    }


    if (request.msg == 'syncAuthorization'){
      if (!request.token){
        callback(localStorage.token)
      } else {
        chrome.tabs.remove(sender.tab.id);
      }
    }


    if (request.msg == 'closeWindow'){
      console.log('closeWindow');
      chrome.tabs.remove(sender.tab.id);
    }


    if (request.msg === 'takeFullPageScreenshot'){
      yield* takeFullPageScreenshot();
    }


    if(request.msg === 'takeVisiblePageScreenshot'){
      yield* takeVisibleScreenshot();
    }


    if (request.msg == 'uploadImages'){
      yield* uploadImages(request, sender, callback)
    }


    if (request.msg == 'startOauth'){
      startOauth = true;
    }


    if (request.msg == 'shareImage'){
      yield* shareImage(request, sender, callback)
    }


    if (request.msg == 'cancel'){
      cancelRequest = true;
      screenshot.canvas = null;
      sendedrequest = {};
      cropData = null;
      chrome.runtime.sendMessage({msg: 'cancelXHR'});
      setTimeout(function () {
        cancelRequest = false;
        chrome.browserAction.setBadgeText({text: JSON.parse(localStorage.capturedImages || '[]').length || ''});
      }, 500);
    }


    if (request.msg == 'logOutUser'){
      CoIntercom.loggedOut({});
      CoIntercom.shutdown();
    }


  }())
});







function* takeFullPageScreenshot(){
  var tab = yield chrome.tabs.getSelected.bind(null, null);
  yield chrome.tabs.executeScript.bind(null, tab.id, {file: 'build/scroll_page.js'});
  yield chrome.tabs.sendRequest.bind(null, tab.id, {msg: 'scrollPage'});
  yield* screenshotCaptured(screenshot, tab.url, tab.title);
  
  track('#SNAPPED FULL PAGE', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});
}

function* takeVisibleScreenshot(){
  var canvas = yield* captureVisible();
  var tab = yield chrome.tabs.getSelected.bind(null, null);
  yield* screenshotCaptured({canvas: canvas}, tab.url, tab.title);
  
  track('#SNAPPED SCREEN AREA', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});

}


function* capturePage(data, sender, callback) {
  var progressStatus = parseInt(data.complete * 100, 10) + '%';
  chrome.runtime.sendMessage({msg: 'progress', progress: progressStatus, progressMsg: 'Capturing...'});
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

  yield* captureVisible({left: data.x, top: data.y});
  callback(true);
}




function* captureVisible(canvasPos){
  var dataURI = yield chrome.tabs.captureVisibleTab.bind(null, null, {format: 'png', quality: 100});
  
  return yield new Promise((resolve,reject)=>{
      var image = new Image();
      image.onload = function () {
        if(screenshot.canvas) {
          screenshot.canvas.getContext('2d').drawImage(image, canvasPos.left, canvasPos.top);
          resolve();
        } else {
          var capturedImageSize = {width: this.width, height: this.height, left: 0, top: 0};
          if(cropData) capturedImageSize = cropData;
          
          var canvas = document.createElement('canvas');
          canvas.width = capturedImageSize.width;
          canvas.height = capturedImageSize.height;
          canvas.getContext('2d').drawImage(image, capturedImageSize.left, capturedImageSize.top, capturedImageSize.width, capturedImageSize.height, 0, 0, capturedImageSize.width, capturedImageSize.height);
          resolve(canvas);
          console.log(canvas);
        }
      };
      image.src = dataURI;
  })
}

function* storeFromDataCanvas(canvas, pageUrl){
  var dataURI = canvas.toDataURL();
  var blob = dataURItoBlob(dataURI);
  
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

  var fs = yield window.webkitRequestFileSystem.bind(null, window.TEMPORARY, blob.size);
  var fileEntry = yield fs.root.getFile.bind(null, name, {create: true});
  var fileWriter = yield fileEntry.createWriter;
  yield new Promise((resolve, reject)=>{
    fileWriter.onwriteend = () => resolve();
    fileWriter.write(blob);
  });
  
  return url;
}


function* screenshotCaptured(screenshot, pageUrl, pageTitle){
  console.log(screenshot);
  var fileUrl = yield* storeFromDataCanvas(screenshot.canvas, pageUrl);
  
  var pageTitleRes = sendedrequest.pageTitle || pageTitle;

  var capturedImage = {
    link: fileUrl,
    size: {width: screenshot.canvas.width, height: screenshot.canvas.height},
    url: pageUrl,
    pins: sendedrequest.pins,
    pageTitle: pageTitleRes
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
}


function* uploadImages(req){
  var activeBoard = req.activeBoard;
  var activeFolder = req.activeFolder;
  var capturedImages = JSON.parse(localStorage.capturedImages);

  if(activeBoard.id == 'new_board'){
    activeBoard = yield httprequest.post('http://codesign.io/api/folders/'+ activeFolder.id + '/boards/', {}, {title: capturedImages[0].pageTitle});
  }
  
  for (var i in capturedImages){
    var capturedImage = capturedImages[i];
    var post = yield httprequest.post('http://codesign.io/api/boards/'+ activeBoard.id + '/posts/', {}, {title: capturedImage.url + " " + (new Date).toString()});
    var fileEntry = window.webkitResolveLocalFileSystemURL.bind(null, capturedImage.link)
    var file = yield fileEntry.file;
    yield httprequest.post('http://codesign.io/api/posts/'+post.id+'/images', {}, file);
    track('#UPLOADED IMAGE SUCESSFULLY', {"WEB_URL": capturedImage.url, "PAGE-TITLE": activeBoard.title, "BOARD-ID": activeBoard.id, LINK: "http://www.codesign.io/board/" + activeBoard.client_code});
  }

  window.open("http://www.codesign.io/board/" + activeBoard.client_code);
  chrome.browserAction.setBadgeText({text: ''});
  
  localStorage.capturedImages = '[]';

}
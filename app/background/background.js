require('babel-polyfill');
window.Promise = require('bluebird');

var screenshot = {};
var sendedrequest = {};
var cropData = null;
var startOauth;
var cancelRequest;
var firstAuthorization;


const {track, CoIntercom } = require('./analitics');
const httprequest = require('./../request');
const {dataURItoBlob, randomStr} = require('./../utils');
const genRunner = require('../genrunner');



chrome.runtime.onInstalled.addListener(function(){
  chrome.tabs.create({'url': 'http://dev0.codesign.io/checkauthorization'});
});

chrome.runtime.setUninstallURL('http://dev0.codesign.io/chrome?uninstalled=true');


var getSelectedTab = function () {
  return new Promise((resolve, reject)=>{
    chrome.tabs.getSelected(null, function (tab) {
      resolve(tab);
    })
  })
}


var messageListener = function(request, sender, callback) {

  genRunner(function*() {
    console.log('got message', request);

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
      var tab = yield getSelectedTab();

      localStorage.token = request.token;
      var user = yield httprequest.get('http://dev0.codesign.io/api/users/me');

      if(user.role != 'guest'){
        chrome.tabs.remove(tab.id);
        !firstAuthorization && chrome.tabs.create({'url': 'http://dev0.codesign.io/chrome?successfully_installed=true'});

        localStorage.me = JSON.stringify(user);
        CoIntercom.boot(user.id, user.first_name, user.created_at);
        CoIntercom.loggedIn({login_type: request.urlProvider ? request.urlProvider : 'email'});
        if (!request.fromSite) chrome.tabs.create({'url': 'http://dev0.codesign.io/syncauthorization', selected: false});
      } else {
        localStorage.token = '';
        firstAuthorization = true;
        localStorage.firstAuthorization = 'true';
        chrome.tabs.update(tab.id, {url: 'http://dev0.codesign.io/chrome?extension_authorization=true'})
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
}

chrome.runtime.onMessageExternal.addListener(messageListener)
chrome.runtime.onMessage.addListener(messageListener);







var takeFullPageScreenshot = function*(){
  var tab = yield getSelectedTab();
  yield new Promise((resolve, reject)=>{
    chrome.tabs.executeScript(tab.id, {file: 'build/scroll_page.js'}, function () {
      chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
        resolve()
      });
    });
  });
  yield* screenshotCaptured(screenshot, tab.url, tab.title);

  console.log('takeFullPageScreenshot end');

  track('#SNAPPED FULL PAGE', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});
}

var takeVisibleScreenshot = function*(){
  var canvas = yield* captureVisible();
  var tab = yield getSelectedTab();
  yield* screenshotCaptured({canvas: canvas}, tab.url, tab.title);

  track('#SNAPPED SCREEN AREA', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});

}


var capturePage = function*(data, sender, callback) {
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

  console.log('try capture visible');

  yield* captureVisible({left: data.x, top: data.y});
  console.log('after capture visible', callback);
  var tab = yield getSelectedTab();
  chrome.tabs.sendRequest(tab.id, {msg: 'processEnd'});
}




var captureVisible = function*(canvasPos){
  var dataURI = yield new Promise((resolve, reject)=> {
    chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100}, function(data){
      resolve(data);
    });
  });

  return yield new Promise((resolve,reject)=>{
    console.log('new image');
      var image = new Image();
      image.onload = function () {
        console.log('image onload', screenshot.canvas);
        if(screenshot.canvas) {
          console.log('try canvas before draw');
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
        }
      };
      image.src = dataURI;
  })
}

var storeFromDataCanvas = function*(canvas, pageUrl){
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
  yield new Promise((resolve, reject)=>{
    window.webkitRequestFileSystem(window.TEMPORARY, blob.size, function (fs) {
      fs.root.getFile(name, {create: true}, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = () => resolve();
          fileWriter.write(blob);
        })
      });
    });
  });

  return url;
}


var screenshotCaptured = function*(screenshot, pageUrl, pageTitle){
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


var uploadImages = function*(req){
  var activeBoard = req.activeBoard;
  var activeFolder = req.activeFolder;
  var capturedImages = JSON.parse(localStorage.capturedImages);

  var readCodeObj;
  if(activeBoard.id == 'new_board'){
    activeBoard = yield httprequest.post('http://dev0.codesign.io/api/folders/'+ activeFolder.id + '/boards', {}, {title: capturedImages[0].pageTitle, status: "AC", post_preview_id: ''});
    readCodeObj = yield httprequest.post('http://dev0.codesign.io/api/boards/'+ activeBoard.id + '/boards_codes', {}, {code: randomStr(6), role: 'CL', boards_id: activeBoard.id});
    yield httprequest.post('http://dev0.codesign.io/api/boards/'+ activeBoard.id + '/boards_codes', {}, {code: randomStr(6), role: 'CB', boards_id: activeBoard.id});
  }

  for (var i in capturedImages){
    var capturedImage = capturedImages[i];
    var post = yield httprequest.post('http://dev0.codesign.io/api/boards/'+ activeBoard.id + '/posts', {}, {title: capturedImage.url + " " + (new Date).toString()});
    yield httprequest.put('http://dev0.codesign.io/api/boards/'+ activeBoard.id, {}, {post_preview_id: post.id});

    var file = yield new Promise((resolve, reject)=>{
      window.webkitResolveLocalFileSystemURL(capturedImage.link, function (fileEntry) {
        fileEntry.file(function (file) {
          resolve(file)
        })
      })
    });
    var image = yield httprequest.post('http://dev0.codesign.io/api/posts/'+post.id+'/images', {}, file);
    yield httprequest.put('http://dev0.codesign.io/api/posts/'+ post.id, {}, {imageversion_id: image.id});
    track('#UPLOADED IMAGE SUCESSFULLY', {"WEB_URL": capturedImage.url, "PAGE-TITLE": activeBoard.title, "BOARD-ID": activeBoard.id, LINK: "http://dev0.codesign.io/board/" + activeBoard.client_code});
  }


  console.log('upload done');

  window.open("http://dev0.codesign.io/board/" + (readCodeObj && readCodeObj.code || activeBoard.boards_codes.filter((bc=>bc.role=="CL"))[0].code));
  chrome.browserAction.setBadgeText({text: ''});

  localStorage.capturedImages = '[]';

}
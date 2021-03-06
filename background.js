import assign from 'object-assign';

(function () {
  var w = window;
  var ic = w.Intercom;
  if (typeof ic === "function") {
    ic('reattach_activator');
    ic('update', intercomSettings);
  } else {
    var d = document;
    var i = function () {
      i.c(arguments)
    };
    i.q = [];
    i.c = function (args) {
      i.q.push(args)
    };
    w.Intercom = i;
    function l() {
      var s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://widget.intercom.io/widget/ufe67jbo';
      var x = d.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s, x);
    }

    if (w.attachEvent) {
      w.attachEvent('onload', l);
    } else {
      w.addEventListener('load', l, false);
    }
  }
})()









function track (event, data) {
  console.log('track ', event, data);
  window.Intercom('trackEvent', event, data);
}
var CoIntercom = {
  boot (id, name, email, created_at) {
    console.log('Intercom.boot: start');
    window.Intercom('boot', {
      app_id: 'lid3oqje',
      user_id: id,
      name: name,
      email: email,
      created_at: created_at,
      extension: true,
    });

    console.log('Intercom.boot: done');
  },

  shutdown () {
    console.log('Intercom.shutdown');
    window.Intercom('shutdown');
  },

    // facebook, github, email
    loggedIn (data) {
      track('#LOGGED IN VIA EXTENSION', data);
    },

    loggedOut (data) {
      track('#LOGGED OUT VIA EXTENSION', data);
    },
};



var screenshot = {};
var sendedrequest = {};
var cropData = null;
var startOauth;
var cancelRequest;
var firstAuthorization;

import {request as httprequest} from './app/utils';
import {s3Upload} from './app/utils';
import {dataURItoBlob} from './app/utils';

chrome.contextMenus.create({
  "title": "Add Comment",
  "contexts": ["all"],
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

chrome.runtime.setUninstallURL('http://www.codesign.io/uninstalled');


chrome.extension.onRequest.addListener(function (request, sender, callback) {
  console.log('message ext');
  if (request.msg === 'capturePage') {
    if (!cancelRequest) {
      capturePage(request, sender, callback)
    } else {
      console.log('cancel');
    }
  } else if (request.msg === 'cropData'){
    cropData = request;
    localStorage.currentAction = 'crop';
    chrome.browserAction.setBadgeText({text: 'share'});
  } else if (request.msg == 'addPin' || request.msg == 'deletePin' || request.msg == 'completePin' || request.msg == 'addComment' || request.msg == 'deleteComment'){


    if (!request.commentMode){
      sendedrequest = request;
      if(request.pins.length){
        localStorage.currentAction = 'comment';
      }
    } else {
      sendRequestPin(request,sender, callback)
    }

    chrome.browserAction.setBadgeText({text: request.pins.length ? 'share' : '' });

  } else if (request.msg == 'cancelCrop'){
    cropData = null;
    localStorage.currentAction = '';
    chrome.browserAction.setBadgeText({text: ''});
  }  else if (request.msg == 'checkStartOauth'){
    callback(startOauth);
  } else if (request.msg == 'stopOauth'){
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
  } else if (request.msg == 'syncAuthorization'){
    if (!request.token){
      callback(localStorage.token)
    } else {
      chrome.tabs.remove(sender.tab.id);
    }
  } else if (request.msg == 'closeWindow'){
    console.log('closeWindow');
    chrome.tabs.remove(sender.tab.id);
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('message');
    if (request.msg === 'takeFullPageScreenshot'){
      takeFullPageScreenshot();
    } else if(request.msg === 'takeVisiblePageScreenshot'){
      takeVisibleScreenshot();
    } else if (request.msg == 'uploadImages'){
      uploadImages(request, sender, sendResponse)
    } else if (request.msg == 'startOauth'){
      startOauth = true;
    } else if (request.msg == 'shareImage'){
      shareImage(request, sender, sendResponse)
    } else if (request.msg == 'cancel'){
      cancelRequest = true;
      screenshot.canvas = null;
      sendedrequest = {};
      cropData = null;
      chrome.runtime.sendMessage({msg: 'cancelXHR'});
      setTimeout(function () {
        cancelRequest = false;
        chrome.browserAction.setBadgeText({text: JSON.parse(localStorage.capturedImages || '[]').length || ''});
      }, 500);
    } else if (request.msg == 'logOutUser'){
      CoIntercom.loggedOut({});
      CoIntercom.shutdown();
    } else if (request.msg == 'liveBoard'){
      console.log('liveboard message');
      loadBoardData(request, sender, sendResponse);
    }
  });

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    console.log('receive external message');
    if (request.msg == 'liveBoard'){
      console.log('liveboard message');
      loadBoardData(request, sender, sendResponse);
    }
  });

function takeFullPageScreenshot(){
  chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
        chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
          track('#SNAPPED FULL PAGE', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});
          screenshotCaptured(screenshot, tab.url, tab.title)
        });
      });
  });
}



function takeVisibleScreenshot(){
  captureVisible(function(canvas){
    chrome.tabs.getSelected(null, function (tab) {
      screenshotCaptured({canvas: canvas}, tab.url, tab.title);
      track('#SNAPPED SCREEN AREA', {"WEB_URL": tab.url, "PAGE-TITLE": tab.title});
    })
  })
}


function capturePage(data, sender, callback) {
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


function screenshotCaptured(screenshot, pageUrl, pageTitle){
  console.log(screenshot);
  storeFromDataCanvas(screenshot.canvas, pageUrl, function(fileUrl){
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


  });
}



function sendRequestPin(request, sender, callback){
  var pin = request.pin;
  var token = localStorage.token;
  var post = request.boardData.posts[0];
  var parentPin = request.parentPin;

  console.log(request);

  if (request.msg == 'addPin'){

    var method = pin.updated ? 'PUT' : 'POST';
    var urlPart = method == 'POST' ? 'posts/' + post.id + '/tasks/' : 'tasks/'+ pin.id;

    httprequest('http://api.codesign.io/' + urlPart, pin.updated ? 'PUT' :'POST', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {
      marker: {
        geometry: {
          left: pin.x/request.width * 100,
          top: pin.y/request.height * 100,
          relativeX: pin.relativeX,
          relativeY: pin.relativeY,
          cssPath: pin.cssPath,
        },
        measure: 'pixel',
        shape: "PN"
      },
      title: pin.text
    }, function (data) {
      callback(data)
    })

    track('#CREATED LIVE BOARD TASK', {"LIVE-URL": request.liveUrl, "WEB-URL": request.webUrl, "PAGE_TITLE": request.documentTitle, ID: pin.id, MESSAGE: pin.text})

  } else if (request.msg == 'addComment'){

    var method = pin.updated ? 'PUT' : 'POST';
    var urlPart = method == 'POST' ? 'tasks/' + request.parentPin.id + '/comments/' : 'comments/'+ pin.id;

      httprequest('http://api.codesign.io/'+ urlPart, method , {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {
      title: pin.text
    }, function (data) {
        callback(data)
      })

    track('#CREATED LIVE BOARD COMMENT', {"LIVE-URL": request.liveUrl, "WEB-URL": request.webUrl, "PAGE_TITLE": request.documentTitle, ID: pin.id, MESSAGE: pin.text})

  } else if (request.msg == 'deletePin'){

    httprequest('http://api.codesign.io/tasks/' + pin.id, 'DELETE', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {}, function (data) {})

  } else if (request.msg == 'deleteComment'){

    httprequest('http://api.codesign.io/comments/' + pin.id, 'DELETE', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {}, function (data) {})


  } else if (request.msg == 'completePin'){


    httprequest('http://api.codesign.io/tasks/'+ pin.id, 'PUT', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {
      status: pin.completed ? "CP" : "AC"
    }, function (data) {})

    track('#MARKED LIVE BOARD TASK AS COMPLETED', {"LIVE-URL": request.liveUrl, "WEB-URL": request.webUrl, "PAGE_TITLE": request.documentTitle, ID: pin.id, MESSAGE: pin.text});


  } else if (request.msg == 'movePin'){
    var payLoadData = {
      dragging: true,
      geometry: {
        left: pin.x/request.width * 100,
        top: pin.y/request.height * 100,
        relativeX: pin.relativeX,
        relativeY: pin.relativeY,
        cssPath: pin.cssPath,
      },
      id: pin.id,
      shape: "PN",
      task: pin.id
    };

    httprequest('http://api.codesign.io/markers/'+ pin.id, 'PUT', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, payLoadData , function (data) {});

    track('#MOVED LIVE BOARD TASK PIN', {"LIVE-URL": request.liveUrl, "WEB-URL": request.webUrl, "PAGE_TITLE": request.documentTitle, ID: pin.id, MESSAGE: pin.text});

  }
}


function loadBoardData(req, sender, sendResponse){
  var token = localStorage.token;
  var code = req.boardCode;
  httprequest('http://api.codesign.io/get_board/?code='+code, 'GET', {"Authorization": 'Token ' +  token}, null, function (data) {

    var url = data.board.description.match(/url:(.+)\s/)[1];

    var liveUrl ='http://www.codesign.io/live/'+ code;
    var boardThumbnail = data.board.posts[0].images[0];
    var capturedImage = {
      link: boardThumbnail && boardThumbnail.thumbnail_url,
      size: {width: boardThumbnail && boardThumbnail.width, height: boardThumbnail && boardThumbnail.height},
      url: url,
      pins: [],
      pageTitle: '',
      sharedLink: liveUrl,
      liveUrl: true
    };

    localStorage.currentLiveBoard = JSON.stringify(capturedImage);

    var pins = data.board.posts[0].tasks;

      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.update(tab.id, {url: url});

        function UpdatedListener(tabId , info) {
          if (tabId == tab.id && info.status == "loading") {
            chrome.tabs.onUpdated.removeListener(UpdatedListener);
            chrome.tabs.executeScript(tab.id, {code: 'window.codesign = {me: '+ localStorage.me+'};'+ 'window.codesignPins = ' + JSON.stringify(pins) + ';'+ 'window.codesignBoardData = ' + JSON.stringify(data.board)}, function () {
              chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
                chrome.tabs.sendRequest(tab.id, {msg: 'loadPins', liveUrl: url, webUrl: liveUrl}, function () {
                });
              });
            });
          }
        }


        chrome.tabs.onUpdated.addListener(UpdatedListener);
      });


    track('#OPENED LIVE BOARD VIA CLIENT LINK', {"LIVE-URL": url, "WEB-URL": data.board.title, ID: data.board.id});

  })
}



function shareImage (req, sender, sendResponse){
  var token = localStorage.token;
  var capturedImages = JSON.parse(localStorage.capturedImages);
  var sharedImage = capturedImages.filter((img)=> img.link == req.image.link)[0];

  httprequest('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' +  token}, null, function (data) {

    var folders = data.results;
    var sharedFolder = data.results.filter((fol) => fol.title == "My live boards")[0];

    if (!sharedFolder){
      httprequest('http://api.codesign.io/folders/', 'POST', {"Authorization": 'Token ' +  token, "Content-Type": "application/json;charset=UTF-8"}, {

        title: "My live boards",
        personal: true,

      }, function (data) {
        createSharedPage(data)
      })
    } else {
      createSharedPage(sharedFolder)
    }


    function createSharedPage(sharedFolder){
      httprequest('http://api.codesign.io/folders/'+ sharedFolder.id + '/boards/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
        title: sharedImage.pageTitle,
        description: 'url:'+ sharedImage.url + ' #liveboard'
      }, function (boardData) {

        httprequest('http://api.codesign.io/boards/'+ boardData.id + '/posts/', 'POST', {
          "Authorization": 'Token ' + token,
          "Content-Type": "application/json;charset=UTF-8"
        }, {
          title: (new Date).toString()
        }, function (postData) {



          function logCallBack(){
            console.log(arguments)
          }


          httprequest('http://api.codesign.io/posts/'+ postData.id + '/images/get_upload_url/?filename='+ sharedImage.name +'&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
            console.log(data1);

            window.webkitResolveLocalFileSystemURL(sharedImage.link, function(fileEntry){
              console.log('fillllle');
              fileEntry.file(function(file) {
                s3Upload(data1.image_upload_url, file, logCallBack, function (data2) {

                  var canvas = document.createElement('canvas');
                  canvas.width = 250;
                  canvas.height = 150;
                  var image = new Image();
                  image.onload = function () {
                    canvas.getContext('2d').drawImage(image, 0,0, this.width, this.width*0.6, 0,0, 250,150);

                    var blob =  dataURItoBlob(canvas.toDataURL());
                    s3Upload(data1.thumbnail_upload_url, blob, logCallBack, function () {

                      httprequest('http://api.codesign.io/posts/'+ postData.id +'/images/', 'POST', {
                        "Authorization": 'Token ' + token,
                        "Content-Type": "application/json;charset=UTF-8"
                      }, {
                        image_upload_url:data1.image_upload_url,
                        thumbnail_upload_url: data1.thumbnail_upload_url,
                        width: sharedImage.size.width,
                        height: sharedImage.size.height
                      }, function (data3) {

                        console.log('finish')

                      });

                    });

                  };
                  image.src = sharedImage.link;

                });
              });
            });

          });



          var reqCount = 0;
          for (var i = 0; i < sharedImage.pins.length;i++) {
            var pin = sharedImage.pins[i];
            httprequest('http://api.codesign.io/posts/' + postData.id + '/tasks/', 'POST', {
              "Authorization": 'Token ' + token,
              "Content-Type": "application/json;charset=UTF-8"
            }, {
              marker: {
                geometry: {
                  left: pin.x/sharedImage.size.width * 100,
                  top: pin.y/sharedImage.size.height * 100,
                  relativeX: pin.relativeX,
                  relativeY: pin.relativeY,
                  cssPath: pin.cssPath,
                },
                measure: 'pixel',
                shape: "PN"
              },
              title: pin.text
            }, function (data3) {



              function CompleteRequest(){
                reqCount++;
                if (reqCount == sharedImage.pins.length) {

                  var url = 'http://www.codesign.io/live/'+boardData.client_code;
                  sharedImage.sharedLink = url;
                  localStorage.capturedImages = JSON.stringify(capturedImages);
                  chrome.runtime.sendMessage({msg: 'sharedImage', url: url});


                  track('#CREATED LIVE BOARD', {"LIVE-URL": url, "WEB-URL": boardData.title, ID: boardData.id});
                  track('#CREATED LIVE BOARD CLIENT LINK', {"LIVE-URL": url, "WEB-URL": boardData.title, ID: boardData.id});

                }
              }


              function CheckComments(){
                if(!pin.children.length){
                  CompleteRequest();
                } else {
                  var commentsCount = 0;
                  for (var i = 0; i < pin.children.length; i++) {
                    var comment = pin.children[i];


                    httprequest('http://api.codesign.io/tasks/' + data3.id + '/comments/', 'POST', {
                      "Authorization": 'Token ' + token,
                      "Content-Type": "application/json;charset=UTF-8"
                    }, {
                      title: comment.text
                    }, function () {
                      commentsCount++;
                      if (commentsCount == pin.children.length){
                        CompleteRequest();
                      }

                    })
                  }
                }
              }

              if (pin.completed){
                httprequest('http://api.codesign.io/tasks/'+ data3.id, 'PUT', {
                  "Authorization": 'Token ' + token,
                  "Content-Type": "application/json;charset=UTF-8"
                }, {
                  status: "CP"
                }, function () {
                  CheckComments()
                })

              } else {
                CheckComments();
              }

            });
          }



        })

      });
    }

  })


}





function uploadImages(req, sender, sendResponse){
  var token = localStorage.token;
  var activeBoard = req.activeBoard;
  var activeFolder = req.activeFolder;
  var posts = [];
  var capturedImages = JSON.parse(localStorage.capturedImages);

  function logCallBack(value){
    chrome.runtime.sendMessage({msg: 'progress', progress: value, progressMsg: 'Uploading...'})
  }


  if(activeBoard.id == 'new_board'){
    httprequest('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
      title: capturedImages[0].pageTitle
    }, function (data) {
      activeBoard = data;
      uploadImageProcess(activeBoard,posts, logCallBack);
    });

  } else {

    httprequest('http://api.codesign.io/boards/' + activeBoard.id + '/posts/', 'GET', {"Authorization": 'Token ' + token}, null, function (data) {
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

    var hasShared = capturedImage.sharedLink;
    var liveBoardLabel = hasShared ? ' liveboard' : '';

    httprequest('http://api.codesign.io/boards/'+ activeBoard.id + '/posts/', 'POST', {
      "Authorization": 'Token ' + token,
      "Content-Type": "application/json;charset=UTF-8"
    }, {
      title: capturedImage.url + " " + (new Date).toString() + liveBoardLabel
    }, function (data) {
      console.log(data);
      httprequest('http://api.codesign.io/posts/'+ data.id + '/images/get_upload_url/?filename='+ capturedImage.name +'&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
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
                canvas.getContext('2d').drawImage(image, 0,0, this.width, this.width*0.6, 0,0, 250,150);

                var blob =  dataURItoBlob(canvas.toDataURL());
                s3Upload(data1.thumbnail_upload_url, blob, logCallBack, function () {

                  httprequest('http://api.codesign.io/posts/'+ data.id +'/images/', 'POST', {
                    "Authorization": 'Token ' + token,
                    "Content-Type": "application/json;charset=UTF-8"
                  }, {
                    image_upload_url:data1.image_upload_url,
                    thumbnail_upload_url: data1.thumbnail_upload_url,
                    width: capturedImage.size.width,
                    height: capturedImage.size.height
                  }, function (data3) {

                    httprequest('http://api.codesign.io/boards/'+ activeBoard.id + '/update_order/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8"}, {
                      keys: posts.map((post)=> post.id).concat(data.id)
                    }, function () {


                      if(capturedImage.pins){

                        var reqCount = 0;
                        for (var i = 0; i < capturedImage.pins.length;i++) {
                          var pin = capturedImage.pins[i];
                          httprequest('http://api.codesign.io/posts/' + data.id + '/tasks/', 'POST', {
                            "Authorization": 'Token ' + token,
                            "Content-Type": "application/json;charset=UTF-8"
                          }, {
                            marker: {
                              geometry: {
                                left: pin.x/capturedImage.size.width * 100,
                                top: pin.y/capturedImage.size.height * 100,
                                relativeX: pin.relativeX,
                                relativeY: pin.relativeY,
                                cssPath: pin.cssPath,
                              },
                              measure: 'pixel',
                              shape: "PN"
                            },
                            title: pin.text
                          }, function (data3) {



                            function CompleteRequest(){
                              reqCount++;
                              if (reqCount == capturedImage.pins.length) {
                                track('#UPLOADED IMAGE SUCESSFULLY', {"WEB_URL": capturedImage.url, "PAGE-TITLE": activeBoard.title, "BOARD-ID": activeBoard.id, LINK: "http://www.codesign.io/board/" + activeBoard.client_code});
                                capImgCount++;

                                if (capImgCount == capturedImages.length) {
                                  window.open("http://www.codesign.io/board/" + activeBoard.client_code);
                                  chrome.browserAction.setBadgeText({text: ''});
                                  localStorage.capturedImages = '[]';
                                }

                              }
                            }


                            function CheckComments(){
                              if(!pin.children.length){
                                CompleteRequest();
                              } else {
                                var commentsCount = 0;
                                for (var i = 0; i < pin.children.length; i++) {
                                  var comment = pin.children[i];


                                  httprequest('http://api.codesign.io/tasks/' + data3.id + '/comments/', 'POST', {
                                    "Authorization": 'Token ' + token,
                                    "Content-Type": "application/json;charset=UTF-8"
                                  }, {
                                    title: comment.text
                                  }, function () {
                                    commentsCount++;
                                    if (commentsCount == pin.children.length){
                                      CompleteRequest();
                                    }

                                  })
                                }
                              }
                            }

                            if (pin.completed){
                              httprequest('http://api.codesign.io/tasks/'+ data3.id, 'PUT', {
                                "Authorization": 'Token ' + token,
                                "Content-Type": "application/json;charset=UTF-8"
                              }, {
                                status: "CP"
                              }, function () {

                                CheckComments()

                              })

                            } else {
                              CheckComments();
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
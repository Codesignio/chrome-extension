/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!***********************!*\
  !*** ./background.js ***!
  \***********************/
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _utils = __webpack_require__(/*! ./app/utils */ 1);
	
	var screenshot = {};
	var sendedrequest = {};
	var cropData = null;
	var capturedImages = [];
	var images = [];
	
	chrome.contextMenus.create({
	  "title": "Add Comment",
	  "contexts": ["page"],
	  "onclick": clickHandler
	});
	
	function clickHandler(e) {
	  chrome.tabs.getSelected(null, function (tab) {
	    chrome.tabs.executeScript(tab.id, { file: 'page-script-compiled/comment.js' }, function () {
	      chrome.tabs.sendRequest(tab.id, { msg: 'contextMenu' }, function () {});
	    });
	  });
	}
	
	chrome.extension.onRequest.addListener(function (request, sender, callback) {
	  if (request.msg === 'capturePage') {
	    capturePage(request, sender, callback);
	  } else if (request.msg === 'cropData') {
	    cropData = request;
	    localStorage.currentAction = 'crop';
	    chrome.browserAction.setBadgeText({ text: 'crop' });
	  } else if (request.msg == 'addPin') {
	    sendedrequest = request;
	    localStorage.currentAction = 'comment';
	    chrome.browserAction.setBadgeText({ text: request.pins.length.toString() });
	  }
	});
	
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	  if (request.msg === 'takeFullPageScreenshot') {
	    takeFullPageScreenshot();
	  } else if (request.msg === 'takeVisiblePageScreenshot') {
	    takeVisibleScreenshot();
	  } else if (request.msg == 'uploadImages') {
	    uploadImages(request, sender, sendResponse);
	  }
	});
	
	function takeFullPageScreenshot() {
	  chrome.tabs.getSelected(null, function (tab) {
	    chrome.tabs.executeScript(tab.id, { file: 'page.js' }, function () {
	      chrome.tabs.sendRequest(tab.id, { msg: 'scrollPage' }, function () {
	        screenshotCaptured(screenshot, tab.url);
	      });
	    });
	  });
	}
	
	function takeVisibleScreenshot() {
	  captureVisible(function (canvas) {
	    chrome.tabs.getSelected(null, function (tab) {
	      screenshotCaptured({ canvas: canvas }, tab.url);
	    });
	  });
	}
	
	function capturePage(data, sender, callback) {
	  var progressStatus = parseInt(data.complete * 100, 10) + '%';
	  chrome.runtime.sendMessage({ msg: 'progress', progress: progressStatus });
	  chrome.browserAction.setBadgeText({ text: progressStatus });
	
	  var scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ? 1 / data.devicePixelRatio : 1;
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
	
	  captureVisible(function () {
	    callback(true);
	  }, { left: data.x, top: data.y });
	}
	
	function captureVisible(callBack, canvasPos) {
	  chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 100 }, function (dataURI) {
	
	    if (dataURI) {
	      var image = new Image();
	      image.onload = function () {
	
	        if (screenshot.canvas) {
	          screenshot.canvas.getContext('2d').drawImage(image, canvasPos.left, canvasPos.top);
	          callBack();
	        } else {
	          var capturedImageSize = { width: this.width, height: this.height, left: 0, top: 0 };
	          if (cropData) capturedImageSize = cropData;
	
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
	  });
	}
	
	function storeFromDataCanvas(canvas, pageUrl, callBack) {
	  var dataURI = canvas.toDataURL();
	  var byteString = atob(dataURI.split(',')[1]);
	  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
	  var ab = new ArrayBuffer(byteString.length);
	  var ia = new Uint8Array(ab);
	  for (var i = 0; i < byteString.length; i++) {
	    ia[i] = byteString.charCodeAt(i);
	  }
	  var blob = new Blob([ab], { type: mimeString });
	  var size = blob.size + 1024 / 2;
	
	  var name = pageUrl.split('?')[0].split('#')[0];
	  if (name) {
	    name = name.replace(/^https?:\/\//, '').replace(/[^A-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^[_\-]+/, '').replace(/[_\-]+$/, '');
	    name = '-' + name;
	  } else {
	    name = '';
	  }
	  name = 'screencapture' + name + '-' + Date.now() + '.png';
	  var url = 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name;
	
	  window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
	    fs.root.getFile(name, { create: true }, function (fileEntry) {
	      fileEntry.createWriter(function (fileWriter) {
	        fileWriter.onwriteend = function () {
	          return callBack(url);
	        };
	        fileWriter.write(blob);
	      });
	    });
	  });
	}
	
	function screenshotCaptured(screenshot, pageUrl) {
	  console.log(screenshot);
	  storeFromDataCanvas(screenshot.canvas, pageUrl, function (fileUrl) {
	
	    var capturedImage = {
	      link: fileUrl,
	      size: { width: screenshot.canvas.width, height: screenshot.canvas.height },
	      url: pageUrl.split('?')[0],
	      pins: sendedrequest.pins,
	      pageTitle: sendedrequest.pageTitle
	    };
	
	    images.push(capturedImage);
	    capturedImages.push(capturedImage);
	    localStorage.capturedImages = JSON.stringify(capturedImages);
	    localStorage.images = JSON.stringify(images);
	    chrome.runtime.sendMessage({ msg: 'captured', capturedImage: capturedImage });
	    screenshot.canvas = null;
	    sendedrequest = {};
	    cropData = null;
	  });
	}
	
	function uploadImages(req, sender, sendResponse) {
	  var token = localStorage.token;
	  var activeBoard = req.activeBoard;
	  var activeFolder = req.activeFolder;
	  var posts = [];
	
	  function logCallBack(value) {
	    chrome.runtime.sendMessage({ msg: 'progress', progress: value });
	  }
	
	  if (activeBoard.id == 'new_board') {
	    (0, _utils.request)('http://api.codesign.io/folders/' + activeFolder.id + '/boards/', 'POST', { "Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
	      title: "New Board"
	    }, function (data) {
	      activeBoard = data;
	      localStorage.activeBoard = JSON.stringify(data);
	      uploadImageProcess(activeBoard, posts, logCallBack);
	    });
	  } else {
	
	    (0, _utils.request)('http://api.codesign.io/boards/' + activeBoard.id + '/posts/', 'GET', { "Authorization": 'Token ' + token }, null, function (data) {
	      posts = data.results;
	      uploadImageProcess(activeBoard, posts, logCallBack);
	    });
	  }
	}
	
	function uploadImageProcess(activeBoard, posts, logCallBack) {
	
	  var token = localStorage.token;
	  var capturedImages = JSON.parse(localStorage.capturedImages);
	
	  var capImgCount = 0;
	  capturedImages.forEach(function (capturedImage) {
	
	    (0, _utils.request)('http://api.codesign.io/boards/' + activeBoard.id + '/posts/', 'POST', {
	      "Authorization": 'Token ' + token,
	      "Content-Type": "application/json;charset=UTF-8"
	    }, {
	      title: capturedImage.url + " " + new Date().toString()
	    }, function (data) {
	      console.log(data);
	      (0, _utils.request)('http://api.codesign.io/posts/' + data.id + '/images/get_upload_url/?filename=' + capturedImage.name + '&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', { "Authorization": 'Token ' + token }, null, function (data1) {
	        console.log(data1);
	
	        window.webkitResolveLocalFileSystemURL(capturedImage.link, function (fileEntry) {
	          console.log('fillllle');
	          fileEntry.file(function (file) {
	            (0, _utils.s3Upload)(data1.image_upload_url, file, logCallBack, function (data2) {
	
	              var canvas = document.createElement('canvas');
	              canvas.width = 250;
	              canvas.height = 150;
	              var image = new Image();
	              image.onload = function () {
	                canvas.getContext('2d').drawImage(image, 0, 0, this.width, this.height, 0, 0, 250, 150);
	
	                var blob = (0, _utils.dataURItoBlob)(canvas.toDataURL());
	                (0, _utils.s3Upload)(data1.thumbnail_upload_url, blob, logCallBack, function () {
	
	                  (0, _utils.request)('http://api.codesign.io/posts/' + data.id + '/images/', 'POST', {
	                    "Authorization": 'Token ' + token,
	                    "Content-Type": "application/json;charset=UTF-8"
	                  }, {
	                    image_upload_url: data1.image_upload_url,
	                    thumbnail_upload_url: data1.thumbnail_upload_url,
	                    width: capturedImage.size.width,
	                    height: capturedImage.size.height
	                  }, function (data3) {
	
	                    (0, _utils.request)('http://api.codesign.io/boards/' + activeBoard.id + '/update_order/', 'POST', { "Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
	                      keys: posts.map(function (post) {
	                        return post.id;
	                      }).concat(data.id)
	                    }, function () {
	
	                      if (capturedImage.pins) {
	
	                        var reqCount = 0;
	                        for (var i = 0; i < capturedImage.pins.length; i++) {
	                          var pin = capturedImage.pins[i];
	                          (0, _utils.request)('http://api.codesign.io/posts/' + data.id + '/tasks/', 'POST', {
	                            "Authorization": 'Token ' + token,
	                            "Content-Type": "application/json;charset=UTF-8"
	                          }, {
	                            marker: {
	                              geometry: {
	                                left: pin.x / capturedImage.size.width * 100,
	                                top: pin.y / capturedImage.size.height * 100
	                              },
	                              measure: 'pixel',
	                              shape: "PN"
	                            },
	                            title: pin.text
	                          }, function (data3) {
	                            reqCount++;
	                            if (reqCount == capturedImage.pins.length) {
	
	                              capImgCount++;
	
	                              if (capImgCount == capturedImages.length) {
	                                window.open("http://www.codesign.io/board/" + JSON.parse(localStorage.activeBoard).client_code);
	                                chrome.browserAction.setBadgeText({ text: '' });
	                                localStorage.capturedImages = '[]';
	                                capturedImages = null;
	                                sendedrequest = {};
	                              }
	                            }
	                          });
	                        }
	                      } else {
	
	                        capImgCount++;
	
	                        if (capImgCount == capturedImages.length) {
	                          window.open("http://www.codesign.io/board/" + JSON.parse(localStorage.activeBoard).client_code);
	                          chrome.browserAction.setBadgeText({ text: '' });
	                          localStorage.capturedImages = '[]';
	                          capturedImages = null;
	                          sendedrequest = {};
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
	  });
	}

/***/ },
/* 1 */
/*!**********************!*\
  !*** ./app/utils.js ***!
  \**********************/
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.request = request;
	exports.s3Upload = s3Upload;
	exports.dataURItoBlob = dataURItoBlob;
	function request(url, method, headers, body, callback) {
	  var xhr = new XMLHttpRequest();
	  var json = JSON.stringify(body);
	  xhr.open(method, url, true);
	  for (var i in headers) {
	    xhr.setRequestHeader(i, headers[i]);
	  };
	  xhr.onreadystatechange = function () {
	    if (xhr.readyState != 4) return;
	    callback(JSON.parse(xhr.responseText));
	  };
	  xhr.send(json);
	}
	
	function s3Upload(url, imageFile, logCallback, callBack) {
	
	  var xhr = new XMLHttpRequest();
	  xhr.onerror = function (e) {
	    console.log('error');
	  };
	
	  xhr.upload.addEventListener('progress', function (e) {
	    var percent = Math.round(e.loaded / e.total * 100);
	    logCallback(percent);
	  }, false);
	
	  xhr.onreadystatechange = function () {
	    if (xhr.readyState === XMLHttpRequest.DONE) {
	      if (xhr.status >= 200 && xhr.status <= 299) {
	        callBack(xhr.responseText);
	      } else {
	        console.log('error');
	      }
	    }
	  };
	
	  xhr.open('PUT', url, true);
	  xhr.setRequestHeader('Content-Type', 'image/jpeg');
	  xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000');
	  xhr.send(imageFile);
	}
	
	function dataURItoBlob(dataURL) {
	  var BASE64_MARKER = ';base64,';
	  if (dataURL.indexOf(BASE64_MARKER) == -1) {
	    var parts = dataURL.split(',');
	    var contentType = parts[0].split(':')[1];
	    var raw = decodeURIComponent(parts[1]);
	
	    return new Blob([raw], { type: contentType });
	  }
	
	  var parts = dataURL.split(BASE64_MARKER);
	  var contentType = parts[0].split(':')[1];
	  var raw = window.atob(parts[1]);
	  var rawLength = raw.length;
	
	  var uInt8Array = new Uint8Array(rawLength);
	
	  for (var i = 0; i < rawLength; ++i) {
	    uInt8Array[i] = raw.charCodeAt(i);
	  }
	
	  return new Blob([uInt8Array], { type: contentType });
	}

/***/ }
/******/ ]);
//# sourceMappingURL=background-compiled.js.map
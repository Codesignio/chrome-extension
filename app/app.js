import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils';

import LoginForm from './components/login-form';
import SelectAndUpload from './components/select-and-upload';

class App extends React.Component {
  constructor(props) {
    super(props);
    var capturedImage = JSON.parse(localStorage.currentCaptureImage || 'null');
    this.state = {
      status: capturedImage ? 'captured': 'actions',
      screenshot: null,
      contentURL: '',
      images: JSON.parse(localStorage.images || '[]'),
      token: localStorage.token,
      capturedImage: capturedImage,
      unsupported: false
    }
  }

  componentWillMount() {

    var me = this;
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.executeScript(tab.id, {code:"{}"}, function () {
        me.setState({unsupported: chrome.runtime.lastError !== undefined});
      })});

    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'capturePage') {
        this.capturePage(request, sender, callback);
      }
    }.bind(this));
  }

  takeScreenshoot(e) {
    var me = this;
    chrome.tabs.captureVisibleTab(null, {format: 'png', quality: 100}, function (dataURI) {

      if (dataURI) {
        var image = new Image();
        image.onload = function () {
          var canvas = document.createElement('canvas');
          var capturedImageSize = {width: this.width, height: this.height};
          canvas.width = this.width;
          canvas.height = this.height;

          canvas.getContext('2d').drawImage(image, 0, 0, this.width, this.height, 0, 0,  this.width, this.height);

          var canvasURI = canvas.toDataURL();

          var byteString = atob(canvasURI.split(',')[1]);
          var mimeString = canvasURI.split(',')[0].split(':')[1].split(';')[0];
          var ab = new ArrayBuffer(byteString.length);
          var ia = new Uint8Array(ab);
          for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          var blob = new Blob([ab], {type: mimeString});
          var size = blob.size + (1024 / 2);

          chrome.tabs.getSelected(null, function (tab) {


            var name = tab.url.split('?')[0].split('#')[0];
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
              var capturedImage = {link: url, name: name, size: capturedImageSize};
              me.state.images.push(capturedImage);
              localStorage.images = JSON.stringify(me.state.images);
              localStorage.currentCaptureImage = JSON.stringify(capturedImage);
              me.setState({status: 'captured', capturedImage: capturedImage});
            }

            window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
              fs.root.getFile(name, {create: true}, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                  fileWriter.onwriteend = onwriteend
                  fileWriter.write(blob);
                });
              });
            });

          })

        };
        image.src = dataURI;
      }
    })
  }

  takeFullPageScreenshoot() {
    var me =this;
    chrome.tabs.getSelected(null, function (tab) {
      var loaded = false;
      chrome.tabs.executeScript(tab.id, {file: 'page.js'}, function () {
        loaded = true;
        this.sendScrollMessage(tab);
      }.bind(me));
    });
  }

  sendScrollMessage(tab) {
    var me = this;
    this.state.contentURL = tab.url;
    this.state.screenshot = {};
    chrome.tabs.sendRequest(tab.id, {msg: 'scrollPage'}, function () {
      this.openPage();
    }.bind(me));
  }

  capturePage(data, sender, callback) {
    this.setState({status: 'progress', progress: parseInt(data.complete * 100, 10) + '%'});
    var screenshot = this.state.screenshot;
    var canvas;

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

  openPage() {
    var screenshot = this.state.screenshot;

    var dataURI = screenshot.canvas.toDataURL();

    var capturedImageSize = {width: screenshot.canvas.width, height: screenshot.canvas.height};

    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], {type: mimeString});
    var size = blob.size + (1024 / 2);
    var name = this.state.contentURL.split('?')[0].split('#')[0];
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

    var me = this;
    function onwriteend() {
      var url = 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name;
      var capturedImage = {link: url, name: name, size: capturedImageSize};
      me.state.images.push(capturedImage);
      localStorage.images = JSON.stringify(me.state.images);
      me.setState({status: 'captured', capturedImage: capturedImage});
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

  imgClick(url, e){
    chrome.tabs.create({url: url});
  }


  handleLogin(token){
    this.setState({token: token})
    localStorage.token = token;
  }

  handleUpload(uploadedPost){
    localStorage.currentCaptureImage = '';
    request('http://api.codesign.io/boards/' + uploadedPost.boardID + '/codes/', 'GET', {"Authorization": 'Token ' + this.state.token}, null, function (data) {
      var boardCode = data.results[0].code;
      this.setState({status: 'uploaded', uploadedPost: {link: "http://www.codesign.io/board/" + boardCode + "?post="+ uploadedPost.postID}})
    }.bind(this))
  }
  handleUploaded(){
    this.setState({status: 'actions'});
    window.open(this.state.uploadedPost.link);
  }

  renderPopup(){

    if (!this.state.token){
      return <LoginForm handleLogin={this.handleLogin.bind(this)}></LoginForm>
    } else if (this.state.status == 'progress'){
      return <div className="progress_bar" style={{width: this.state.progress}}></div>
    } else if (this.state.status == 'captured'){
      return (
        <div>
          <img src={this.state.capturedImage.link}/>
          <SelectAndUpload handleUpload={this.handleUpload.bind(this)} image={this.state.capturedImage} token={this.state.token}/>
        </div>
      )
    } else if (this.state.status == 'actions'){
      return (
        <div id="screenshot-app">
          <div className="actions">
            {this.state.unsupported ? <p>This page don't supported capture screenshot</p> :
              <div>
                <button onClick={this.snapScreen.bind(this)}>Snap screen area</button>
                <button onClick={this.takeScreenshoot.bind(this)}>Snap visible part</button>
                <button onClick={this.takeFullPageScreenshoot.bind(this)}>Snap a full page</button>
              </div>}
            <button onClick={()=> this.setState({status: 'list'})}>List Images</button>
          </div>
        </div>
      )
    } else if (this.state.status == 'list'){
      return (
        <div id="images-list">
          <div className="images">
            {this.state.images && this.state.images.map(function (img, i) {
              return <img key={i} src={img.link} onClick={this.imgClick.bind(this, img.link)} style={{heght: 500}}/>
            }.bind(this))}
          </div>
          <button className="basicButton" onClick={()=> this.setState({status: 'actions'})}>Back</button>
        </div>
      )
    } else if(this.state.status == 'uploaded'){
      return (
        <div id="screenshot-app">
          <div className="actions">
            <button onClick={()=> this.setState({status: 'actions'})}>Back to actions</button>
            <button onClick={this.handleUploaded.bind(this)}>Go to Board</button>
          </div>
        </div>
      )
    }
  }

  render() {
    return (
      <div id="popup">
        {this.renderPopup()}
      </div>
    )
  }

  snapScreen(){
    var me =this;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/bundle.js'}, function () {
        window.close();
      });
    });
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
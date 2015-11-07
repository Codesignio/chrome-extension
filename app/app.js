import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils'
import {s3Upload} from './utils'
import {dataURItoBlob} from './utils'

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
      capturedImage: capturedImage
    }
  }

  componentWillMount() {
    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'capturePage') {
        this.capturePage(request, sender, callback);
      }
    }.bind(this));
  }

  takeScreenshoot(e) {
    var me = this;
    chrome.tabs.captureVisibleTab(null, {format: 'jpeg', quality: 100}, function (dataURI) {

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
            name = 'screencapture' + name + '-' + Date.now() + '.jpeg';

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
      null, {format: 'jpeg', quality: 100}, function (dataURI) {
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
    name = 'screencapture' + name + '-' + Date.now() + '.jpeg';

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

  handleUpload(){
    localStorage.currentCaptureImage = '';
    this.setState({status: 'actions'})
  }

  renderPopup(){

    if (!this.state.token){
      return <LoginForm handleLogin={this.handleLogin.bind(this)}></LoginForm>
    } else if (this.state.status == 'progress'){
      return <ProgressBar progress={this.state.progress}/>
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
            <button onClick={this.snapScreen.bind(this)}>Snap screen area</button>
            <button onClick={this.takeScreenshoot.bind(this)}>Snap visible part</button>
            <button onClick={this.takeFullPageScreenshoot.bind(this)}>Snap a full page</button>
          </div>
        </div>
      )
    } else if (this.state.status == 'list'){
      return (
        <div id="images">
          {this.state.images && this.state.images.map(function (img, i) {
            return <img key={i} src={img.link} onClick={this.imgClick.bind(this, img.link)} style={{heght: 500}}/>
          }.bind(this))}
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

class SelectAndUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folders: [],
      boards: [],
      activeFolder: null,
      activeBoard: null,
    }
  }

  componentWillMount() {
    request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data1) {
      request('http://api.codesign.io/folders/'+ data1.results[0].id + '/boards/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data2) {
        this.setState({
          folders: data1.results,
          activeFolder: data1.results[0].id,
          boards: data2.results,
          activeBoard: data2.results[0].id
        });
      }.bind(this))
    }.bind(this));

  }

  setFolder(e) {
    request('http://api.codesign.io/folders/'+ e.target.value + '/boards/', 'GET', {"Authorization": 'Token ' + this.props.token}, null, function (data) {
      this.setState({activeFolder: e.target.value, boards: data.results, activeBoard: data.results[0].id});
    }.bind(this));
  }

  setBoard(e) {
    this.setState({
      activeBoard: e.target.value
    })
  }

  logProgress(value){
    this.setState({progress: value})
  }


  uploadImage(){
    var token = this.props.token;
    var me = this;
    var capturedImage = this.props.image;
    var link = this.props.image.link;
    this.setState({status: 'progress', progress: 0});
    request('http://api.codesign.io/boards/'+ this.state.activeBoard + '/posts/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8" }, {
      title: capturedImage.name
    }, function (data) {
      console.log(data);

      request('http://api.codesign.io/posts/'+ data.id + '/images/get_upload_url/?filename='+ capturedImage.name +'&image_type=image%2Fjpeg&thumbnail_type=image%2Fjpeg', 'GET', {"Authorization": 'Token ' + token}, null, function (data1) {
        console.log(data1);

        window.webkitResolveLocalFileSystemURL(link, function(fileEntry){
          fileEntry.file(function(file) {
            s3Upload(data1.image_upload_url, file, me.logProgress.bind(me), function (data2) {

              var canvas = document.createElement('canvas');
              canvas.width = 250;
              canvas.height = 150;
              var image = new Image();
              image.onload = function () {
                canvas.getContext('2d').drawImage(image, 0,0, this.width, this.height, 0,0, 250,150);

                var blob =  dataURItoBlob(canvas.toDataURL('image/jpeg'));
                s3Upload(data1.thumbnail_upload_url, blob, me.logProgress.bind(me), function () {

                  request('http://api.codesign.io/posts/'+ data.id +'/images/', 'POST', {"Authorization": 'Token ' + token, "Content-Type": "application/json;charset=UTF-8"}, {
                    image_upload_url:data1.image_upload_url,
                    thumbnail_upload_url: data1.thumbnail_upload_url,
                    width: capturedImage.size.width,
                    height: capturedImage.size.height
                  }, function (data3) {
                    me.props.handleUpload()
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

  handleCancel(){
    localStorage.currentCaptureImage = '';
    this.props.handleUpload();
  }

  render(){
    return (
     <div className="uploadWidget">
        <p className="uploadTitle">Place to upload</p>
       {this.state.status == 'progress' && <ProgressBar progress={this.state.progress} />}
       <div className="selectors">
        <select onChange={this.setBoard.bind(this)}>
          {this.state.boards && this.state.boards.map(function(board,i){
            return <option key={i} value={board.id}>{board.title}</option>
          })}
        </select>
        <select onChange={this.setFolder.bind(this)}>
          {this.state.folders && this.state.folders.map(function(folder, i){
            return <option key={i} value={folder.id}>{folder.title}</option>
          })}
        </select>
       </div>
       <div className="buttons">
         <button id="cancelButton" onClick={this.handleCancel.bind(this)}>Cancel</button>
        <button id="uploadButton" onClick={this.uploadImage.bind(this)}>Upload</button>
       </div>
      </div>
    )
  }
}


class ProgressBar extends React.Component {
  render() {
    return <div className="progress_bar" style={{width: this.props.progress}}></div>
  }
}

class LoginForm extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      status: null
    }
  }
  handleSubmit(e){
    var me = this;
    e.preventDefault();

    var xhr = new XMLHttpRequest();
    var json = JSON.stringify({username: this.refs.email.value, password: this.refs.password.value});
    xhr.open("POST", 'http://api.codesign.io/users/token/username/', true);
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4) return;
      if (xhr.status != 200) {
        me.setState({status: xhr.status + ': ' + xhr.statusText});
      } else {
        console.log(xhr.responseText);
        me.props.handleLogin(JSON.parse(xhr.responseText).token);
      }
    };
    xhr.send(json);
  }
  render(){
    return (
    <div className="login-form">
      {this.state.status && <p>Wrong email or password</p>}
      <p className="title">Log in</p>
      <button className="facebook-login">Log In with Facebook</button>
      <p>or <a className="google-login">Google</a>, <a className="github-login">Github</a></p>
      <p className="email-login">or Log in with Email</p>
      <form onSubmit={this.handleSubmit.bind(this)}>
        <input type="text" ref="email" placeholder="Email"/>
        <input type="password" ref="password" placeholder="Password"/>
        <input type="submit" value="Log in"/>
      </form>
      <p className="signup-title">Please <a className="sign-up">Sign Up</a> if you don't have an account</p>
    </div>
    )
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
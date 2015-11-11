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
      images: JSON.parse(localStorage.images || '[]'),
      token: localStorage.token,
      capturedImage: capturedImage,
      unsupported: false,
      activeBoard: JSON.parse(localStorage.activeBoard || 'null'),
      activeFolder: JSON.parse(localStorage.activeFolder || 'null')
    }
  }

  componentWillMount() {
    chrome.browserAction.setBadgeText({text: ''});
    var me = this;
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.executeScript(tab.id, {code:"{}"}, function () {
        me.setState({unsupported: chrome.runtime.lastError !== undefined});
      })});

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.msg === 'captured') {
          chrome.browserAction.setBadgeText({text: ''});
          this.state.images.push(request.capturedImage);
          this.setState({capturedImage: request.capturedImage, status: 'captured'});
        } else if (request.msg === 'progress'){
          this.setState({status: 'progress', progress: request.progress})
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
              var capturedImage = {link: url, name: name, size: capturedImageSize, url: tab.url.split('?')[0]};
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
    chrome.runtime.sendMessage({msg: 'takeFullPageScreenshoot', token: this.state.token});
  }

  imgClick(url, e){
    chrome.tabs.create({url: url});
  }


  handleLogin(token){
    this.setState({token: token})
    localStorage.token = token;
  }

  backToActions(){
    localStorage.currentCaptureImage = '';
    this.setState({status: 'actions'});
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

  handleChangeSelectorsState(obj){
    if (obj.folder){
      localStorage.activeFolder = obj.folder;
      this.setState({activeFolder: obj.folder})
    }
    if (obj.board){
      localStorage.activeBoard = obj.board;
      this.setState({activeBoard: obj.board})
    }
  }

  logOut(){
    this.setState({token: null});
    localStorage.token = '';
  }

  openMenu(e){
    this.setState({menu: !this.state.menu});
    e.stopPropagation();
  }

  renderPopup(){

    if (!this.state.token){
      return <LoginForm handleLogin={this.handleLogin.bind(this)}></LoginForm>
    } else if (this.state.status == 'progress'){
      return <div className="progress_bar" style={{width: this.state.progress}}></div>
    } else if (this.state.status == 'captured'){
      return (
        [<div key="screenshot" className="screenshot">
          <img src={this.state.capturedImage.link}/>
        </div>, <SelectAndUpload
          key="upload"
          backToActions={this.backToActions.bind(this)}
          activeBoard={this.state.activeBoard}
          activeFolder={this.state.activeFolder}
          handleChangeSelectorsState={this.handleChangeSelectorsState.bind(this)}
          handleUpload={this.handleUpload.bind(this)}
          image={this.state.capturedImage}
          token={this.state.token}/>]
      )
    } else if (this.state.status == 'actions'){
      return (
        <div id="screenshot-app" onClick={()=> this.setState({menu: false})}>
          <div className="menu-icon" onClick={this.openMenu.bind(this)}></div>
          {this.state.menu && <div className="menu">
            <div className="menu-item logOut" onClick={this.logOut.bind(this)}>Log out</div>
          </div>}
          <div className="actions">
            {this.state.unsupported ? <p>This page don't supported capture screenshot</p> :
              <div>
                <button onClick={this.addComment.bind(this)}>Add comment</button>
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

  addComment(){
    var me =this;
    chrome.runtime.sendMessage({msg: 'token', token: this.state.token});
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
        chrome.tabs.insertCSS(null, {file: 'pageStyles.css'}, function(){
          window.close();
        });
      });
    });
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
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
    var capturedImage = JSON.parse(localStorage.capturedImage || 'null');
    this.state = {
      status: capturedImage ? 'captured': 'actions',
      images: JSON.parse(localStorage.images || '[]'),
      token: localStorage.token,
      capturedImage: capturedImage,
      unsupported: false,
      currentAction: localStorage.currentAction
    }
  }

  componentWillMount() {
    var me = this;
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.executeScript(tab.id, {code:"{}"}, function () {
        me.setState({unsupported: chrome.runtime.lastError !== undefined});
      })});

    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        if (request.msg == 'captured') {
          chrome.browserAction.setBadgeText({text: ''});
          me.state.images.push(request.capturedImage);
          me.setState({capturedImage: request.capturedImage, status: 'captured'});
        } else if (request.msg == 'progress'){
          me.setState({status: 'progress', progress: request.progress})
        } else if (request.msg == 'upload_done'){
          me.handleUpload()
        }
      }.bind(this));


  }

  componentDidMount(){
    var me = this;
    if(this.state.currentAction == 'comment'){
      chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendRequest(tab.id, {msg: 'removeOverlay'}, function () {
            chrome.runtime.sendMessage({msg: 'takeFullPageScreenshoot'});
            me.setState({status: 'progress'})
          });
      });
    }
  }

  handleUpload(payload){
    localStorage.capturedImage = '';
    window.open("http://www.codesign.io/board/" + localStorage.activeBoard.client_code);
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
              localStorage.capturedImage = JSON.stringify(capturedImage);
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
    this.setState({status: 'actions'});
  }

  logOut(){
    this.setState({token: null});
    localStorage.token = '';
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
          handleUpload={this.backToActions.bind(this)}
          image={this.state.capturedImage}/>]
      )
    } else if (this.state.status == 'actions'){
      return (
        <div id="screenshot-app">
          <div className="actions">
            {this.state.unsupported ? <p>This page don't supported capture screenshot</p> :
                [<div key="1" onClick={this.takeFullPageScreenshoot.bind(this)}><span>Snap a full page</span></div>,
                <div key="2" onClick={this.takeScreenshoot.bind(this)}><span>Snap visible part</span></div>,
                <div key="3" onClick={this.snapScreen.bind(this)}><span>Snap screen area</span></div>,
                <div key="4" onClick={this.addComment.bind(this)}><span>Add comment</span></div>
              ]}
          </div>
          <div className="title-and-links">
            <p>codesign.io</p>
            <p>Simplest feedback tool</p>
            <div className="links">
              <a href="http://www.codesign.io/dashboard/" target="_blank">Dashboard</a>
              <a className="imagesList" onClick={()=> this.setState({status: 'list'})}>List Images</a>
              <a className="logOut" onClick={this.logOut.bind(this)}>Log out</a>
            </div>
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
          window.close();
        });
    });
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
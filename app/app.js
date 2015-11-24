import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils';

import SelectAndUpload from './components/select-and-upload';

class App extends React.Component {
  constructor(props) {
    super(props);
    var capturedImages = JSON.parse(localStorage.capturedImages || '[]');
    this.state = {
      status: capturedImages.length ? 'captured': 'actions',
      images: JSON.parse(localStorage.images || '[]'),
      token: localStorage.token,
      capturedImages: capturedImages,
      checkedImages: [],
      unsupported: false,
      currentAction: localStorage.currentAction,
      showHideIcon: [],
      me: JSON.parse(localStorage.me)
    }
  }

  componentWillMount() {
    if (!localStorage.token){
      chrome.tabs.create({'url': chrome.extension.getURL('login.html')}, function (tab) {
      });
    }

    chrome.browserAction.setBadgeText({text: ''});
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
          me.state.capturedImages.push(request.capturedImage);
          me.setState({status: 'captured'});
        } else if (request.msg == 'progress'){
          me.setState({status: 'progress', progress: request.progress})
        }
      }.bind(this));


  }

  componentDidMount(){
    var me = this;
    if(this.state.currentAction == 'comment'){
      chrome.tabs.getSelected(null, function (tab) {
          chrome.tabs.sendRequest(tab.id, {msg: 'removeOverlay'}, function () {
            chrome.runtime.sendMessage({msg: 'takeFullPageScreenshot'});
            me.setState({status: 'progress'})
            localStorage.currentAction = "";
          });
      });
    } else if(this.state.currentAction == 'crop'){
      chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendRequest(tab.id, {msg: 'removeOverlay'}, function () {
          chrome.runtime.sendMessage({msg: 'takeVisiblePageScreenshot'});
          me.setState({status: 'progress'});
          localStorage.currentAction = "";
        });
      });
    }
  }

  takeScreenshoot(e) {
    chrome.runtime.sendMessage({msg: 'takeVisiblePageScreenshot'});
  }

  takeFullPageScreenshoot() {
    chrome.runtime.sendMessage({msg: 'takeFullPageScreenshot'});
  }

  snapScreen(){
    var me = this;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/bundle.js'}, function () {
        me.setState({status: 'crop-click-title'});
        setTimeout(function(){window.close()}, 3000);
      });
    });
  }

  addComment(){
    var me = this;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {code: 'window.codesign = {me: '+ localStorage.me+'}'}, function () {
        chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
          me.setState({status: 'comment-click-title'});
          setTimeout(function(){window.close()}, 3000);

        });
      });
    });
  }





  imgClick(url, e){
    chrome.tabs.create({url: url});
  }

  backToActions(){
    this.state.capturedImages = JSON.parse(localStorage.capturedImages || '[]');
    this.setState({status: 'actions'});
  }

  logOut(){
    this.setState({token: null});
    localStorage.token = '';
    chrome.tabs.create({'url': chrome.extension.getURL('login.html')}, function (tab) {
    });
  }

  removeImage(img){
    this.state.images.splice(this.state.images.indexOf(img), 1);
    localStorage.images = JSON.stringify(this.state.images);
    if (!this.state.images.length){
      this.state.status =  'actions';
    }
    this.setState({});
  }

  checkUploadImage(img){
    if(this.state.checkedImages.indexOf(img) > -1){
      this.state.checkedImages.splice(this.state.checkedImages.indexOf(img), 1)
    } else {
      this.state.checkedImages.push(img);
    }
    this.setState({})
  }

  uploadChecked(){
    this.state.capturedImages = this.state.checkedImages;
    localStorage.capturedImages = JSON.stringify(this.state.capturedImages);
    this.setState({status: 'captured'})
  }

  showIcon(img, e){
    e.stopPropagation();
    this.state.showHideIcon[img] = true;
    this.setState({})
  }
  hideIcon(img, e){
    e.stopPropagation();
    this.state.showHideIcon[img] = false;
    this.setState({})
  }

  renderPopup(){

    if (this.state.status == 'progress'){
      return [<div className="progress_bar" style={{width: this.state.progress}}></div>, <span className="progress_bar-title">Capturing...</span>]
    } else if(this.state.status == 'comment-click-title'){
      return <div className="comment-click-title">Pick a screen area you need to snap and click on the icon ↑ to crop and share!</div>
    } else if(this.state.status == 'crop-click-title'){
      return <div className="crop-click-title">Click everywhere you need to leave your feedback right here!</div>
    } else if (this.state.status == 'captured'){
      return (
        <SelectAndUpload
          key="upload"
          backToActions={this.backToActions.bind(this)}
          handleUpload={this.backToActions.bind(this)}
          images={this.state.capturedImages}/>
      )
    } else if (this.state.status == 'actions'){
      return (
        <div id="screenshot-app">
          <div className="actions">
            {this.state.unsupported ? <p className="unsupported">This page does not support capture screenshot</p> :
                [<div key="1" onClick={this.takeFullPageScreenshoot.bind(this)}><span>Snap a full page</span></div>,
                <div key="2" onClick={this.takeScreenshoot.bind(this)}><span>Snap visible part</span></div>,
                <div key="3" onClick={this.snapScreen.bind(this)}><span>Snap screen area</span></div>,
                <div key="4" onClick={this.addComment.bind(this)}><span>Add comment</span></div>,
                  this.state.capturedImages.length ? <div className="back-to-upload" key="5" onClick={()=> this.setState({status: 'captured'})}><span className="back-link">Back to upload dialog</span></div> : null
              ]}
          </div>
          {!this.state.capturedImages.length ? <div className="title-and-links">
            <p>codesign.io</p>
            <p>Simplest feedback tool</p>
            <div className="links">
              <a href="http://www.codesign.io/dashboard/" target="_blank" style={!this.state.images.length ? {marginLeft: '-25px;'} : {}}>Dashboard</a>
              {this.state.images.length ? <a className="imagesList" onClick={()=> this.setState({status: 'list'})}>History({this.state.images.length})</a> : null}
              <a className="logOut" onClick={this.logOut.bind(this)}>Log out</a>
            </div>
          </div> : null}
        </div>
      )
    } else if (this.state.status == 'list'){
      return (
        <div id="images-list">
          <div className="imagesList">
            {this.state.images && this.state.images.concat([]).reverse().map(function (img, i) {
              return (
                <div className="images-wrapper" key={i}>
                  <div className="checkbox">
                  <input type="checkbox" checked={this.state.checkedImages.indexOf(img) > -1} onChange={this.checkUploadImage.bind(this, img)}/>
                    </div>
                  <div className="image">
                  <img src={img.link}
                       onMouseOut={this.hideIcon.bind(this, i)} onMouseMove={this.showIcon.bind(this, i)}
                       onClick={this.imgClick.bind(this, img.link)}/>
                  <div className="removeIcon" style={{display: this.state.showHideIcon[i] ? 'block' : 'none'}}
                       onMouseMove={this.showIcon.bind(this, i)}
                       onClick={this.removeImage.bind(this, img)}></div>
                  </div>
                </div>
              )
            }.bind(this))}
          </div>
          {this.state.checkedImages.length ? <div onClick={this.uploadChecked.bind(this)} className="upload-to-actions">Upload</div> : null}
          <div className="back-to-actions" onClick={()=> this.setState({status: 'actions'})}>Back</div>
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
}

ReactDOM.render(<App/>, document.getElementById('app'));
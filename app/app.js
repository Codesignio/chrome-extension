import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils';

import SelectAndUpload from './components/select-and-upload';

var ReactCSSTransitionGroup = require('react-addons-css-transition-group');

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
    var me = this;
    document.addEventListener('keydown', function(e){
      if (e.keyCode == 27 && me.state.status == 'progress'){
        chrome.runtime.sendMessage({msg: 'cancel'});
        if (this.state.capturedImages.length) {
          this.setState({status: 'captured'})
        } else {
          this.setState({status: 'actions'})
        }
      }
    });

    if (!localStorage.token){
      chrome.tabs.create({'url': chrome.extension.getURL('login.html')}, function (tab) {
      });
    }

    chrome.browserAction.setBadgeText({text: this.state.capturedImages.length ? this.state.capturedImages.length.toString() : ''});
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
          chrome.browserAction.setBadgeText({text: me.state.capturedImages.length ? me.state.capturedImages.length.toString() : ''});
        } else if (request.msg == 'progress'){
          me.setState({status: 'progress', progress: request.progress, progressMsg: request.progressMsg})
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

        if(!localStorage.okCropButton){
          me.setState({status: 'crop-click-title'});
        } else {
          window.close()
        }
      });
    });
  }

  addComment(){
    var me = this;
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {code: 'window.codesign = {me: '+ localStorage.me+'}'}, function () {
        chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
          if(!localStorage.okCommentButton){
            me.setState({status: 'comment-click-title'});
          } else {
            window.close()
          }

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

  okCropButton(){
    localStorage.okCropButton = 'true';
    window.close()
  }

  okCommentButton(){
    localStorage.okCommentButton = 'true';
    window.close()
  }

  renderVadMikhalyov(text, callBack){
    return (
      <div className="task-box">
        <div>
          <div className="CommentBox">
            <div className="top-wrapper">
              <div className="profile">
                <div className="ProfileBar"><img className="avatar" src="https://graph.facebook.com/v2.2/1518963022/picture?type=square&amp;height=600&amp;width=600&amp;return_ssl_resources=1" style={{width:'27px', height:'27px'}}/>
                  <div className="user-name">
                    <div>Vad Mikhalyov</div>
                    <div className="date">CEO and co-founder at Codesign.io</div>
                  </div></div>
              </div>
              <div className="comment"><span className="Linkify"><div className="readonly-text">{text}</div></span></div>
            </div>
          </div>
        </div>
        <button className="cs-btn-flat-active bottom-btn reply-btn" onClick={callBack}>OK</button>
      </div>
    )
  }

  renderPopup(){

    if (this.state.status == 'progress'){
      return [<div className="progress_bar" style={{width: this.state.progress}}></div>, <span className="progress_bar-title">{this.state.progressMsg}</span>]
    } else if(this.state.status == 'comment-click-title'){
      return this.renderVadMikhalyov('Pick a screen area you need to snap and click on the icon ↑ to crop and share!',this.okCommentButton.bind(this))

    } else if(this.state.status == 'crop-click-title'){
      return this.renderVadMikhalyov('Click everywhere you need to leave your feedback right here!',this.okCropButton.bind(this))
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
          {this.state.unsupported ? null : <div className="actions">
                <div key="1" onClick={this.takeFullPageScreenshoot.bind(this)}><span>Snap a full page</span></div>
                <div key="3" onClick={this.snapScreen.bind(this)}><span>Snap screen area</span></div>
                {!this.state.capturedImages.length ? <div key="4" onClick={this.addComment.bind(this)}><span>Add comment</span></div> : null}
                {this.state.capturedImages.length ? <div className="back-to-upload" key="5" style={{backgroundColor: 'white'}} onClick={()=> this.setState({status: 'captured'})}><span className="back-link">← Back to upload dialog</span></div> : null}
          </div>}
          {!this.state.capturedImages.length ? <div className="title-and-links">
            {this.state.unsupported ? [<p></p>, <p className="unsapported-title">Please, open web-page to leave feedback and screen capture!</p>]: [<p>codesign.io</p>,
            <p>Simplest feedback tool</p>]}
            <div className="links">
              <a href="http://www.codesign.io/dashboard/" target="_blank">Dashboard</a>
              {this.state.images.length ? <a className="imagesList" onClick={()=> this.setState({status: 'list'})}>History ({this.state.images.length})</a> : null}
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
        <ReactCSSTransitionGroup transitionName="statelist" transitionEnterTimeout={200} transitionLeaveTimeout={200}>
        {this.renderPopup()}
        </ReactCSSTransitionGroup>
      </div>
    )
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
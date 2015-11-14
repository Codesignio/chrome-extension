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
    var capturedImages = JSON.parse(localStorage.capturedImages || '[]');
    this.state = {
      status: capturedImages.length ? 'captured': 'actions',
      images: JSON.parse(localStorage.images || '[]'),
      token: localStorage.token,
      capturedImages: capturedImages,
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
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/bundle.js'}, function () {
        window.close();
      });
    });
  }

  addComment(){
    chrome.tabs.getSelected(null, function (tab) {
      chrome.tabs.executeScript(tab.id, {file: 'page-script-compiled/comment.js'}, function () {
        window.close();
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

  backToActions(){
    this.state.capturedImages = JSON.parse(localStorage.capturedImages || '[]');
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
          {this.state.capturedImages.concat([]).reverse().map((img, i) => <img key={i} src={img.link}/>)}
        </div>, <SelectAndUpload
          key="upload"
          backToActions={this.backToActions.bind(this)}
          handleUpload={this.backToActions.bind(this)}
          images={this.state.capturedImages}/>]
      )
    } else if (this.state.status == 'actions'){
      return (
        <div id="screenshot-app">
          <div className="actions">
            {this.state.unsupported ? <p className="unsupported">This page don't supported capture screenshot</p> :
                [<div key="1" onClick={this.takeFullPageScreenshoot.bind(this)}><span>Snap a full page</span></div>,
                <div key="2" onClick={this.takeScreenshoot.bind(this)}><span>Snap visible part</span></div>,
                <div key="3" onClick={this.snapScreen.bind(this)}><span>Snap screen area</span></div>,
                <div key="4" onClick={this.addComment.bind(this)}><span>Add comment</span></div>,
                  this.state.capturedImages.length ? <div className="back-to-upload" key="5" onClick={()=> this.setState({status: 'captured'})}><span>Back to uploads</span></div> : null
              ]}
          </div>
          {!this.state.capturedImages.length ? <div className="title-and-links">
            <p>codesign.io</p>
            <p>Simplest feedback tool</p>
            <div className="links">
              <a href="http://www.codesign.io/dashboard/" target="_blank">Dashboard</a>
              <a className="imagesList" onClick={()=> this.setState({status: 'list'})}>List Images</a>
              <a className="logOut" onClick={this.logOut.bind(this)}>Log out</a>
            </div>
          </div> : null}
        </div>
      )
    } else if (this.state.status == 'list'){
      return (
        <div id="images-list">
          <div className="images">
            {this.state.images && this.state.images.concat([]).reverse().map(function (img, i) {
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
}

ReactDOM.render(<App/>, document.getElementById('app'));
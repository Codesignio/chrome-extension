import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './utils';
var ReactCSSTransitionGroup = require('react-addons-css-transition-group');



export default class LoginForm extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      status: null,
      signUpOrLogIn: false
    }
  }
  handleSubmit(e){
    e.stopPropagation();
    var me = this;
    e.preventDefault();


    if(this.state.signUpOrLogIn){
      var xhr = new XMLHttpRequest();
      var json = JSON.stringify({"username": me.refs.email.value, "password1": me.refs.password.value, "password2": me.refs.password.value});
      xhr.open("POST", 'http://api.feature.codesign.io/users/registration/', true);
      xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;
        if (xhr.status != 201) {
          me.setState({status: xhr.status + ': ' + xhr.responseText});
        } else {
          console.log(xhr.responseText);

          var xhr2 = new XMLHttpRequest();
          var json = JSON.stringify({"username": me.refs.email.value, "password": me.refs.password.value});
          xhr2.open("POST", 'http://api.feature.codesign.io/users/token/username/', true);
          xhr2.setRequestHeader('Content-type', 'application/json; charset=utf-8');
          xhr2.onreadystatechange = function() {
            if (xhr2.readyState != 4) return;
            if (xhr2.status != 200) {
              me.setState({status: xhr2.status + ': ' + xhr2.responseText});
            } else {
              console.log(xhr2.responseText);
              var token = JSON.parse(xhr2.responseText).token;
              localStorage.token = JSON.stringify(token);


              var xhr3 = new XMLHttpRequest();
              var json = JSON.stringify({"first_name": me.refs.name.value});
              xhr3.open("PUT", 'http://api.feature.codesign.io/users/me/', true);
              xhr3.setRequestHeader('Content-type', 'application/json; charset=utf-8');
              xhr3.setRequestHeader('Authorization',  'Token ' + token);
              xhr3.onreadystatechange = function() {
                if (xhr3.readyState != 4) return;
                if (xhr3.status != 200) {
                  me.setState({status: xhr3.status + ': ' + xhr3.responseText});
                } else {
                  console.log(xhr3.responseText);
                  //window.close();
                  chrome.extension.sendRequest({msg: 'stopOauth', token: token, urlProvider: 'registered'});
                }
              };
              xhr3.send(json);

            }
          };
          xhr2.send(json);

        }
      };
      xhr.send(json);
    } else {
      var xhr = new XMLHttpRequest();
      var json = JSON.stringify({username: this.refs.email.value, password: this.refs.password.value});
      xhr.open("POST", 'http://api.feature.codesign.io/users/token/username/', true);
      xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;
        if (xhr.status != 200) {
          me.setState({status: xhr.status + ': ' + xhr.statusText});
        } else {
          console.log(xhr.responseText);
          var token = JSON.parse(xhr.responseText).token;
          localStorage.token = JSON.stringify(token);
          //window.close();
          chrome.extension.sendRequest({msg: 'stopOauth', token: token});
        }
      };
      xhr.send(json);
    }
  }

  changeMode(){
    this.state.signUpOrLogIn = !this.state.signUpOrLogIn;
    this.setState({})
  }

  handleOauth(){
    chrome.runtime.sendMessage({msg: 'startOauth'});
  }

  renderLogin(){
    var signUpOrLogIn = this.state.signUpOrLogIn;
    return (
      <div key="popup" onClick={this.hidePopup.bind(this)} className="modal-root modal-backdrop">
        <div onClick={(e)=> e.stopPropagation()} className="modal-body AuthModal">
          <div>
            {this.state.status && <p>{this.state.status}</p>}
            <div className="title">{signUpOrLogIn ? 'Sign Up' : 'Log In'}</div>
            <div>
              <a onClick={this.handleOauth.bind(this)} href="https://www.facebook.com/dialog/oauth?scope=email&client_id=528390150556681&redirect_uri=http://www.codesign.io/?oauthProvider=facebook&state=/" className="facebook-login-btn">
                <span>{signUpOrLogIn ? 'Sign Up' : 'Log In'}</span>
                <span> with Facebook</span></a>
              <div className="other-social-logins">
                <span>or </span>
                <a onClick={this.handleOauth.bind(this)} href="https://accounts.google.com/o/oauth2/auth?response_type=code&scope=openid%20email&client_id=577728361914-n4k1d2unaaqpje4r5pfivs7p3n095at8.apps.googleusercontent.com&redirect_uri=http://www.codesign.io/?oauthProvider=google&state=/" className="google">Google</a>
                </div>
            </div>
            <form className="auth-form">
              <span className="auth-form-title">or {signUpOrLogIn ? 'Sign Up' : 'Log In'} with Email</span>
              <div className="inputs">
                {signUpOrLogIn && <input name="name" type="text" ref="name" placeholder="Name"/>}
                <input name="email" type="text" ref="email" placeholder="Email"/>
                <input name="password" type="password" ref="password" placeholder="Password"/>
                <input type="submit" className="form-submit-btn" onClick={this.handleSubmit.bind(this)}
                       value={signUpOrLogIn ? 'Sign Up' : 'Log In'}/>
              </div>
            </form>
            <div className="auth-info">
          <span>
            <span>Please </span>
            <span className="auth-link" onClick={this.changeMode.bind(this)}>{signUpOrLogIn ? 'Log In': 'Sign Up'}</span>
            <span> if you already have an account</span>
          </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  showLogin(){
    this.setState({
      showPopup: true,
      signUpOrLogIn: false,
    })
  }

  showSignup(){
    this.setState({
      showPopup: true,
      signUpOrLogIn: true,
    })
  }

  hidePopup(){
    this.setState({
      showPopup: false,
    })
  }

  renderLanging(){
    return [<div key="landing" className="chrome-landing-page">


        <header className="main-header">
          <div className="inner">
            <div className="group">
              <div className="col-50">
                <a href="http://www.codesign.io" className="main-logo"><strong className="bold-font">
                  codesign</strong>.io
                </a>
              </div>
              <div className="col-50 align-right">
                <nav className="main-nav">
                  <a href="http://web.feature.codesign.io/about/?" className="main-nav-link">About</a>
                  <a href="http://web.feature.codesign.io/jobs/?" className="main-nav-link">Jobs</a>
                  <a className="main-nav-link" href="javascript:void(0)" onClick={this.showLogin.bind(this)}>
                    Log in
                  </a>
                  <a className="main-nav-link selected" href="javascript:void(0)"
                     onClick={this.showSignup.bind(this)}>Sign up
                  </a>
                </nav>
              </div>
            </div>
          </div>
        </header>

        <section className="content">
          <div className="inner">
            <div className="align-center">

              <div className="">
                <h1 className="bold-font">Extension Installed!</h1>
                <h2>Please, sign up to discuss live feedback on web,<br />
                  make screen capture and get unlimited storage
                </h2>
                <a onClick={this.handleOauth.bind(this)}
                   href="https://www.facebook.com/dialog/oauth?scope=email&client_id=528390150556681&redirect_uri=http://www.codesign.io/?oauthProvider=facebook&state=/"
                   className="install-block signup-with-facebook-btn">
                  <img src="/landing/images/fb-btn-icon.png" alt="Sign up with Facebook"/>
                  Sign up with Facebook
                </a>
                <div className="signup-other-holder">
                  <a onClick={this.handleOauth.bind(this)}
                     href="https://accounts.google.com/o/oauth2/auth?response_type=code&scope=openid%20email&client_id=577728361914-n4k1d2unaaqpje4r5pfivs7p3n095at8.apps.googleusercontent.com&redirect_uri=http://www.codesign.io/?oauthProvider=google&state=/">
                    Google </a>or <a onClick={this.showSignup.bind(this)}>Email</a>
                </div>
                <img src="/landing/images/arrow.png" alt="" className="arrow-pointer"/>
              </div>


              <img src="/landing/images/browser.png" alt="" className="main-image"/>
            </div>
          </div>
        </section>

        <section className="faq-holder">
          <div className="inner">
            <div className="group">
              <div className="faq-block">
                <span className="faq-q">What is browser extension?</span>
                <p className="faq-a">
                  Browser extension is a little app installed in your Chrome Browser. It enriches your browsing experience with extra features, such as bookmarking to Pocket, notes creation for Evernote or fast files uploading via Dropbox. You can check a lot of interesting extensions in Google Chrome Webstore.
                </p>
              </div>
              <div className="faq-block">
                <span className="faq-q">What can I do with Codesign extension?</span>
                <p className="faq-a">
                  Now there is no need to first make a website screenshot and then manually upload it to Codesign. You can do it instantly with your Codesign extension and get a link to share with your collaborators. Codesign extension also allows you to capture full length screenshots. Now you can choose between leaving feedback on live websites or sharing boards as you used to in our web app.
                </p>
              </div>
              <div className="faq-block">
                <span className="faq-q">Live and Board sharing. What’s the difference?</span>
                <p className="faq-a">
                  <span className="bold-font">Live sharing</span>
                  is when you share a link right to website with your feedback. Only people having Desktop Chrome browser and Codesign Chrome Extension installed can view and discuss your comments. It’s perfect for web pages available on public, but if you are on a web page which is not available to everybody (requires an authorization or is locally hosted), your collaborators probably won’t see what you do. In this case you should use Board sharing
                </p>
                <p className="faq-a">
                  <span className="bold-font">Board sharing</span>
                  is a safe and “solid" way to share your feedback via full-length capture. Technically, youupload a web page as a picture into a Codesign board which already has feedback you added. Regular boards are available to view and discuss on every browser, both desktop and mobile, no need for extension installed.
                </p>
              </div>
              <div className="group">
                <div className="col-50">
                  <div className="faq-block">
                    <span className="faq-q">Should I pay for something
                      <br />
                      now or later?
                    </span>
                    <p className="faq-a">No, Codesign Chrome Extension is absolutely free.</p>
                  </div>
                </div>
                <div className="col-50">
                  <div className="faq-block">
                    <span className="faq-q">I need this thing for
                      <br />
                      special needs!
                    </span>
                    <p className="faq-a">Please, contact us
                      <a href="mailto:team@codesign.io" className="green-link">team@codesign.io</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="main-footer">
          <div className="inner align-center">
            <a href="mailto:team@codesign.io" className="footer-link">Contact us</a>
            <a href="//www.iubenda.com/privacy-policy/405562" className="footer-link">Privacy Policy</a>
            <a href="http://facebook.com/codesign.io" className="footer-link">Facebook</a>
            <a href="https://twitter.com/codesignio" className="footer-link">Twitter</a>
            <a href="https://angel.co/codesign-io" className="footer-link">AngelList</a>
          </div>
        </footer>


      </div>, this.state.showPopup && this.renderLogin() ]

  }

  render(){
    return (
    <ReactCSSTransitionGroup transitionName="modal" transitionEnterTimeout={2000} transitionLeaveTimeout={2000}>
      {this.renderLanging()}
    </ReactCSSTransitionGroup>
    )

  }
}

ReactDOM.render(<LoginForm/>, document.getElementById('app'));
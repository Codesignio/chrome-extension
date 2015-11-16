import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './../app/utils';
import cssString from "raw!./../pageStyles.css";


class Frame extends React.Component{

  render() {
    return React.createElement('iframe', assign({}, this.props, {children: undefined}));
  }
  componentDidMount() {
    this.renderFrameContents();
  }
  renderFrameContents() {
    var doc = ReactDOM.findDOMNode(this).contentDocument;
    if(doc && doc.readyState === 'complete') {
      if(!doc.getElementById('codesignStyle')){
        var styleTag = doc.createElement('style');
        styleTag.setAttribute('id', 'codesignStyle');
        var styles = cssString.replace(/module.exports = "/, '');
        styles = styles.replace(/\\n/g, ' ');
        styles = styles.replace(/\\"/g, '"');
        styleTag.innerHTML = styles;
        doc.head.appendChild(styleTag);
        var contentTag = doc.createElement('div');
        contentTag.setAttribute('style', 'width: 100%; height: 100%;');
        contentTag.setAttribute('id', 'contentTag');
        doc.body.appendChild(contentTag);
      }
      var contents = React.createElement('div',
        undefined,
        this.props.head,
        this.props.children
      );

      ReactDOM.render(contents, doc.getElementById('contentTag'));
    } else {
      setTimeout(this.renderFrameContents, 0);
    }
  }
  componentDidUpdate() {
    this.renderFrameContents();
  }
}

class Comment extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      pins: [],
      screenPos: {
        y: window.parent.document.body.scrollTop + window.innerHeight,
        x: window.parent.document.body.scrollLeft + window.innerWidth
      },
      me: window.codesign.me
    }
  }

  componentWillMount() {
    var me = this;
    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'contextMenu') {
        me.newPin(assign(codeSignMousePos, {fromContextMenu: true}))
      } else if(request.msg == 'removeOverlay'){
        var elem = document.getElementById('snap-overlay');
        elem.parentNode.removeChild(elem);
        me.setState({cancel: true});
        callback();
      }
    });
  }

  componentDidMount(){
    window.addEventListener('scroll', this.onScrollHandler.bind(this))
  }

  onScrollHandler(){
    this.setState({
      screenPos: {
        y: window.parent.document.body.scrollTop + window.innerHeight,
        x: window.parent.document.body.scrollLeft + window.innerWidth
      }
    });
  }

  newPin(e) {
    if (e.fromContextMenu || e.target.getAttribute('id') == 'snap-overlay-inner') {
      this.state.pins.forEach(function(pin){
        if(!pin.text){
          this.state.pins.splice(this.state.pins.indexOf(pin));
        }
      }.bind(this));

      var pin  = {
        x: e.pageX,
        y: e.pageY,
      };
      this.state.pins.push(pin);
      this.setState({resentPin: pin});
    }
  }

  addPin(pin){
    pin.added = true;
    this.setState({resentPin: null});
    var data = {
      msg: 'addPin',
      pins: this.state.pins,
      url: document.location.toString(),
      pageTitle: document.title
    };
    chrome.extension.sendRequest(data);
  }

  cancelPin(pin){
    this.state.pins.splice(this.state.pins.indexOf(pin));
    this.setState({});
  }

  textChange(pin,e){
    pin.text = e.target.value;
    this.setState({})
  }

  hidePin(){
    var me = this;
    if (this.timeout){
      return
    } else {
      this.timeout = setTimeout(function () {
        this.timeout = null;
        me.setState({activePin: null});
      }, 300)
    }
  }

  showPin(pin,e){
    e.stopPropagation();
    clearTimeout(this.timeout);
    this.timeout = null;
    this.setState({activePin: pin});
  }

  render() {
    var styles = {
      width: '100%',
      height: '100%',
      zIndex: 1000001,
      position: 'absolute',
      left: 0,
      top: 0,
      cursor: 'crosshair'
    };

    return this.state.cancel ? null : <Frame style={{width: document.body.scrollWidth, height: document.body.scrollHeight, border: 'none'}}><div id="snap-overlay" style={styles}
                onClick={this.newPin.bind(this)}>
      <div id="snap-overlay-inner" style={styles} onMouseMove={this.hidePin.bind(this)}>
      {this.state.pins.map(function(pin, i){
        return (
          <div key={i} className="Pin movable" style={{top: pin.y, left: pin.x, position: 'absolute'}} onMouseMove={this.showPin.bind(this, pin)}>
            <span className="title unselectable">{i+1}</span>
            <div style={{display: this.state.activePin === pin || this.state.resentPin === pin ? 'block' : 'none'}}>
              <div className="Task">
                <div className="task-box">
                  <div>
                  <div className="CommentBox">
                      <div className="top-wrapper">
                        <div className="profile">
                          <div className="ProfileBar">
                            <img className="avatar" src={this.state.me.user.profile.avatar_url}
                                 style={{width:'27px', height:'27px'}}/>
                            <div className="user-name">
                              <div>{this.state.me.user.first_name}</div>
                            </div>
                          </div>
                        </div>
                        <div className="comment">
                          {pin.added ? <div>{pin.text}</div> : <textarea className="input" value={pin.text} onChange={this.textChange.bind(this, pin)} />}
                        </div>
                      </div>
                    {!pin.added && <div className="create-buttons">
                      <button className="bottom-btn cs-btn-flat-active" onClick={this.addPin.bind(this, pin)} disabled={!pin.text}>Add</button>
                      <button className="bottom-btn cs-btn-flat-gray" onClick={this.cancelPin.bind(this, pin)}>Cancel</button>
                    </div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }.bind(this))}
      </div>
    </div>
      </Frame>

  }
}

var el = document.createElement('div');
el.setAttribute('id', 'snap-overlay');
el.setAttribute('style', 'width: '+document.body.scrollWidth + 'px;height:'+document.body.scrollHeight+'px; z-index:1000000; position: absolute; top: 0px; left: 0px;');
document.body.appendChild(el);
ReactDOM.render(<Comment />, el);
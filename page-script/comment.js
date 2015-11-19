import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';
import {request} from './../app/utils';
import cssString from "raw!./../pageStyles.css";


class Frame extends React.Component{
  constructor(props){
    super(props);
    this.state = {}
  }

  render() {
    return !this.state.cancel && React.createElement('iframe', assign({}, this.props, {children: undefined}));
  }
  componentDidMount() {
    this.renderFrameContents();
  }

  onKeyDown(e){
    if (e.keyCode == 27){
      var elem = document.getElementById('snap-overlay');
      if (elem){
        elem.parentNode.removeChild(elem);
        this.setState({cancel: true})
      }
    }
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
        doc.addEventListener('keydown', this.onKeyDown.bind(this), true)
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
        if (elem){
          elem.parentNode.removeChild(elem);
          me.setState({cancel: true});
        }
        callback();
      }
    });
  }

  componentDidMount(){
    window.addEventListener('scroll', this.onScrollHandler.bind(this));
  }

  componentWillUnmount(){
    window.removeEventListener('scroll', this.onScrollHandler.bind(this));
  }

  onScrollHandler(){
    this.setState({
      screenPos: {
        y: window.parent.document.body.scrollTop + window.innerHeight,
        x: window.parent.document.body.scrollLeft + window.innerWidth
      }
    });
  }

  onMouseMoveHandler(e){
    if(this.state.drag){
      e.preventDefault();
      e.stopPropagation();
      var pin = this.state.dragPin;
      pin.x = e.pageX;
      pin.y = e.pageY;
      this.setState({});
    } else {
      this.hidePin()
    }
  }

  startDrag(pin, e){
    if (e.target.getAttribute('class') !== "title unselectable") return;
    e.preventDefault();
    e.stopPropagation();
    this.state.drag = true;
    this.state.dragPin = pin;
    this.setState({})
  }

  endDrag(){
    this.setState({
      drag: false,
      dragPin: null
    })
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

  addPin(pin,i){
    var text = this.refs['textarea'+i].value;
    if (!text) return;
    pin.text = text;
    pin.added = true;
    var timeSeg = (new Date()).toString().split(' ');
    var time = timeSeg[4].split(':')[0]+':'+timeSeg[4].split(':')[1]+' '+timeSeg[1]+' '+timeSeg[2];
    pin.time = time;
    this.setState({resentPin: null});
    var data = {
      msg: 'addPin',
      pins: this.state.pins,
      url: document.location.toString(),
      pageTitle: document.title,
      time: time
    };
    chrome.extension.sendRequest(data);
  }

  keyDownHandler(pin, e){
    if(e.keyCode == 13 && !e.shiftKey){
      this.addPin(pin)
    }
  }

  cancelPin(pin){
    if (pin.text){
      pin.added = true;
      this.setState({});
    } else {
      this.deletePin(pin)
    }
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


  showMenu(){
    this.state.menuActive = !this.state.menuActive;
    this.setState({})
  }

  editPin(pin){
    pin.added = !pin.added;
    this.setState({
      menuActive: false
    })
  }

  deletePin(pin){
    this.state.pins.splice(this.state.pins.indexOf(pin));
    this.setState({});
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
      <div id="snap-overlay-inner" style={styles} onMouseMove={this.onMouseMoveHandler.bind(this)}>
      {this.state.pins.map(function(pin, i){
        return (
          <div ref={pin} key={i} onMouseDown={this.startDrag.bind(this, pin)} onMouseUp={this.endDrag.bind(this)} className="Pin movable" style={{top: pin.y, left: pin.x, position: 'absolute'}} onMouseMove={!this.state.drag && this.showPin.bind(this, pin)}>
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
                              <div>{this.state.me.user.first_name + ' ' + this.state.me.user.last_name}</div>
                              {pin.added && <div className="date">{pin.time}</div>}
                            </div>
                          </div>
                        </div>


                        <div className="menu" onClick={this.showMenu.bind(this)}>
                          <div className="KebabMenu">
                            <div className="dots">
                              <figure className="dot active"></figure>
                              <figure className="dot active"></figure>
                              <figure className="dot active"></figure>
                            </div>
                            {this.state.menuActive && <div className="kebab-dropdown">
                              <div className="menu-item">
                                <span className="cs-link" onClick={this.editPin.bind(this, pin)}>Edit</span>
                              </div>
                              <div className="menu-item">
                                <span className="cs-link" onClick={this.deletePin.bind(this, pin)}>Delete</span>
                              </div>
                            </div>}
                          </div>
                        </div>






                        <div className="comment">
                          {pin.added ? <span className="Linkify"><div className="readonly-text">{pin.text}</div></span> : <textarea ref={"textarea"+ i} onKeyDown={this.keyDownHandler.bind(this, pin)} className="input" defaultValue={pin.text} />}
                        </div>
                      </div>
                    {!pin.added && <div className="create-buttons">
                      <button className="bottom-btn cs-btn-flat-active" onClick={this.addPin.bind(this, pin, i)}>Add</button>
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
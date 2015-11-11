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
        styleTag.innerHTML = styles;
        doc.head.appendChild(styleTag);
      }
      var contents = React.createElement('div',
        undefined,
        this.props.head,
        this.props.children
      );

      ReactDOM.render(contents, doc.body);
    } else {
      setTimeout(this.renderFrameContents, 0);
    }
  }
  componentDidUpdate() {
    this.renderFrameContents();
  }
  componentWillUnmount() {
    React.unmountComponentAtNode(ReactDOM.findDOMNode(this).contentDocument.body);
  }
}

class Comment extends React.Component {
  constructor(props){
    super(props);
    var cursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    this.state = {
      cursor: cursor,
      pins: []
    }
  }

  componentWillMount() {
    var me = this;
    chrome.extension.onRequest.addListener(function (request, sender, callback) {
      if (request.msg === 'contextMenu') {
        me.newPin(assign(codeSignMousePos, {fromContextMenu: true}))
      }
    });

  }

  newPin(e) {
    if (e.fromContextMenu || e.target.getAttribute('id') == 'snap-overlay') {
      this.state.pins.forEach(function(pin){
        if(!pin.text){
          this.state.pins.splice(this.state.pins.indexOf(pin));
        }
      }.bind(this));

      this.state.pins.push({
        x: e.pageX,
        y: e.pageY,
      });
      this.setState({});
    }
  }

  addPin(pin){
    pin.added = true;
    this.setState({});
  }

  cancelPin(pin){
    this.state.pins.splice(this.state.pins.indexOf(pin));
    this.setState({});
  }

  textChange(pin,e){
    pin.text = e.target.value;
    this.setState({})
  }

  uploadPins(e){
    e.stopPropagation();
    e.preventDefault();
    var data = {
      msg: 'takeFullPageScreenshoot',
      pins: this.state.pins,
      url: document.location.toString(),
      pageTitle: document.title
    };
    var me = this;
    chrome.extension.sendRequest(data, function() {
    });
    me.setState({cancel: true});
    var elem = document.getElementById('snap-overlay');
    elem.parentNode.removeChild(el);
    document.body.style.cursor = this.state.cursor;
  }

  render() {
    var styles = {
      width: '100%',
      height: '100%',
      zIndex: 1000001,
      position: 'absolute',
      left: 0,
      top: 0,
    };

    return this.state.cancel ? null : <Frame style={{width: document.body.scrollWidth, height: document.body.scrollHeight}}><div id="snap-overlay" style={styles}
                onClick={this.newPin.bind(this)}>
      {this.state.pins.map(function(pin){
        return (
          <div className="codesign-Pin codesign-movable" style={{top: pin.y, left: pin.x, position: 'absolute'}}>
            <span className="codesign-title codesign-unselectable">1</span>
            <div>
              <div className="codesign-Task">
                <div className="codesign-task-box">
                  <div className="codesign-CommentBox">
                    <div className="codesign-top-wrapper">
                      <div className="codesign-comment">
                        {pin.added ? <div>{pin.text}</div> : <textarea className="codesign-input" value={pin.text} onChange={this.textChange.bind(this, pin)} />}
                      </div>
                      {!pin.added && <div className="codesign-create-buttons">
                        <button className="codesign-bottom-btn codesign-cs-btn-flat-active" onClick={this.addPin.bind(this, pin)}>Add</button>
                        <button className="codesign-bottom-btn codesign-cs-btn-flat-gray" onClick={this.cancelPin.bind(this, pin)}>Cancel</button>
                      </div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }.bind(this))}

      {this.state.pins.length && <div onClick={this.uploadPins.bind(this)} className="codesign-doneButton">FINISH</div>}
    </div>
      </Frame>

  }
}

var el = document.createElement('div');
el.setAttribute('id', 'snap-overlay');
el.setAttribute('style', 'width: '+document.body.scrollWidth + 'px;height:'+document.body.scrollHeight+'px; z-index:1000000; position: absolute; top: 0px; left: 0px;');
document.body.appendChild(el);
ReactDOM.render(<Comment />, el);
import React from 'react';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import assign from 'object-assign';

class Snap extends React.Component {
  constructor(props){
    super(props);
    var cursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    this.state = {
      select: false,
      cursor: cursor,
    }
  }

  componentDidMount(){
    document.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  componentWillUnmount(){
    document.removeEventListener('keydown', this.onKeyDown.bind(this))
  }

  onKeyDown(e){
    if (e.keyCode == 27){
      this.setState({cancel: true});
      var elem = document.getElementById('snap-overlay');
      elem.parentNode.removeChild(el);
    }
  }

  handleMouseDown(e){
    e.stopPropagation();
    e.preventDefault();
    this.setState({
      select: true,
      startX: e.pageX,
      startY: e.pageY,
      width: 0,
      height: 0,
      inverseX: false,
      inverseY: false,
    })
  }

  handleMouseUp(e){
    if (this.state.select){
      this.setState({
        left: this.state.inverseX ? this.state.mouseX : this.state.startX,
        top: this.state.inverseY ? this.state.mouseY : this.state.startY,
      });
      document.body.style.cursor = this.state.cursor;
    }
    this.setState({
      select: false,
      resize: false,
    })
  }

  handleMouseMove(e){
    if (this.state.select){
      this.setState({
        width: Math.abs(e.pageX - this.state.startX),
        height: Math.abs(e.pageY - this.state.startY),
        mouseX: e.pageX,
        mouseY: e.pageY,
        inverseX: (e.pageX - this.state.startX) < 0,
        inverseY: (e.pageY - this.state.startY) < 0,
      })
    } else if(this.state.resize){
      if(this.state.direction == 'bottom-right'){
        this.state.width += e.pageX - this.state.resizeX;
        this.state.height += e.pageY - this.state.resizeY;

      } else if(this.state.direction == 'bottom-left'){
        this.state.width -= e.pageX - this.state.resizeX;
        this.state.height += e.pageY - this.state.resizeY;
        this.state.left += e.pageX - this.state.resizeX;

      } else if(this.state.direction == 'top-left'){
        this.state.width -= e.pageX - this.state.resizeX;
        this.state.height -= e.pageY - this.state.resizeY;
        this.state.left += e.pageX - this.state.resizeX;
        this.state.top += e.pageY - this.state.resizeY;

      } else if(this.state.direction == 'top-right'){
        this.state.width += e.pageX - this.state.resizeX;
        this.state.height -= e.pageY - this.state.resizeY;
        this.state.top += e.pageY - this.state.resizeY;

      } else if(this.state.direction == 'top'){
        this.state.height -= e.pageY - this.state.resizeY;
        this.state.top += e.pageY - this.state.resizeY;

      } else if(this.state.direction == 'bottom'){
        this.state.height += e.pageY - this.state.resizeY;

      } else if(this.state.direction == 'left'){
        this.state.width -= e.pageX - this.state.resizeX;
        this.state.left += e.pageX - this.state.resizeX;

      } else if(this.state.direction = 'right'){
        this.state.width += e.pageX - this.state.resizeX;
      }

      this.setState({
        resizeX: e.pageX,
        resizeY: e.pageY
      })
    }
  }

  startResize(direction, e){
    e.stopPropagation();
    e.preventDefault();
    this.setState({
      resize: true,
      resizeX: e.pageX,
      resizeY: e.pageY,
      direction: direction
    })
  }

  snapSelection(e){
    e.stopPropagation();
    e.preventDefault();
  }

  startDrag(e){
    e.preventDefault();
    e.stopPropagation();
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

    var selectionStyle = {
      position: 'absolute',
      border: '1px dashed black',
      width: this.state.width,
      height: this.state.height,
      left: this.state.select ? (this.state.inverseX ? this.state.mouseX : this.state.startX) : this.state.left,
      top: this.state.select ? (this.state.inverseY ? this.state.mouseY : this.state.startY) : this.state.top,
      boxShadow: '0px 0px 30px 0px rgba(0,0,0,1)'

    };

    var resizerStyle = {
      position: 'absolute',
    }
    return this.state.cancel ? null : <div id="snap-overlay" style={styles}
           onMouseDown={this.handleMouseDown.bind(this)}
           onMouseMove={this.handleMouseMove.bind(this)}
           onMouseUp={this.handleMouseUp.bind(this)}>

      {this.state.width && <div className="selection" onMouseDown={this.startDrag.bind(this)} style={assign({},selectionStyle)}>
          {this.state.select || this.state.resize ? null : [<div key="button" onMouseDown={this.snapSelection.bind(this)} style={{margin: 'auto', width: '100px', height: '20px', textAlign: 'center', lineHeight: '20px', color: 'white', backgroundColor: '#37A037', borderRadius: '0px', position: 'relative', top: '-30px', margin: 'auto', cursor: 'pointer'}}>Snap</div>,
          <div key="resizer top" onMouseDown={this.startResize.bind(this, 'top')} className="resizer top" style={assign({}, resizerStyle, {top: 0, width: '100%', height: '2px', cursor: 'ns-resize'})}></div>,
          <div key="resizer bottom" onMouseDown={this.startResize.bind(this, 'bottom')} className="resizer bottom" style={assign({}, resizerStyle, {bottom: 0, width: '100%', height: '2px', cursor: 'ns-resize'})}></div>,
          <div key="resizer left" onMouseDown={this.startResize.bind(this, 'left')} className="resizer left" style={assign({}, resizerStyle, {left: 0, width: '2px', height: '100%', cursor: 'ew-resize'})}></div>,
          <div key="resizer right" onMouseDown={this.startResize.bind(this, 'right')} className="resizer right" style={assign({}, resizerStyle, {right: 0, width: '2px', height: '100%', cursor: 'ew-resize'})}></div>,
          <div key="resizer top-left" onMouseDown={this.startResize.bind(this, 'top-left')} className="resizer top-left" style={assign({}, resizerStyle, {top: -4, left: -4, width: '8px', height: '8px', cursor: 'nwse-resize'})}></div>,
          <div key="resizer top-right" onMouseDown={this.startResize.bind(this, 'top-right')} className="resizer top-right" style={assign({}, resizerStyle, {top: -4, right: -4, width: '8px', height: '8px', cursor: 'nesw-resize'})}></div>,
          <div key="resizer bottom-right" onMouseDown={this.startResize.bind(this, 'bottom-right')} className="resizer bottom-right" style={assign({}, resizerStyle, {bottom: -4, right: -4, width: '8px', height: '8px', cursor: 'nwse-resize'})}></div>,
          <div key="resizer bottom-left" onMouseDown={this.startResize.bind(this, 'bottom-left')} className="resizer bottom-left" style={assign({}, resizerStyle, {bottom: -4, left: -4, width: '8px', height: '8px', cursor: 'nesw-resize'})}></div>]}
        </div>}
      </div>

  }
}

var el = document.createElement('div');
el.setAttribute('id', 'snap-overlay');
el.setAttribute('style', 'width: '+document.body.scrollWidth + 'px;height:'+document.body.scrollHeight+'px; z-index:1000000; position: absolute; top: 0px; left: 0px;');
document.body.appendChild(el);
ReactDOM.render(<Snap />, el);
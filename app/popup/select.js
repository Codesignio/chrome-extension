const React = require('react');
const request = require('./../request');
const qs = require('qs')

class SelectAndUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folders: JSON.parse(localStorage.folders || '[]'),
      boards: JSON.parse(localStorage.boards || '{}'),
      activeBoard: JSON.parse(localStorage.activeBoard || '{"id": "new_board"}'),
      activeFolder: JSON.parse(localStorage.activeFolder || '{"id": -1, "title": "My boards"}'),
      selectActiveFolder: {id: 1, title: "My boards"},
      me: JSON.parse(localStorage.me),
      images: props.images,
      showHideIcon: []
    }
  }

  componentWillMount() {
    request.get(`http://codesign.io/api/users/${this.state.me.id}/folders`).then((data1)=>{
      var activeFolder = data1.map((f)=> f.id).indexOf(this.state.activeFolder.id) == -1 ? data1.filter((fol) => fol.title == "My boards")[0] : this.state.activeFolder;

      this.setState({
        folders: data1,
        activeFolder: activeFolder
      });
      localStorage.folders = JSON.stringify( data1);

      return request.get('http://codesign.io/api/folders/'+ activeFolder.id + '/boards?'+qs.stringify({embed: [{l:'boards_codes'}, {l: 'posts'}]})).then((data2)=>{
        var activeBoard = data2.map((b)=> b.id).indexOf(this.state.activeBoard.id) == -1 ?  {id: 'new_board'} : this.state.activeBoard;


        this.state.boards[activeFolder.id] = data2;
        this.setState({
          activeBoard: activeBoard,
        });
        localStorage.boards = JSON.stringify(this.state.boards);

      })
    });

    var me = this;

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
      if (request.msg == 'sharedImage') {
        me.state.currentShareImage.sharedLink = request.url;
        me.setState({shareProgress: false})
      }
    })

  }

  setFolder(e) {
    var activeFolder =  this.state.folders.filter((f)=> f.id == e.target.value)[0];
    this.setState({selectActiveFolder: activeFolder});
    request.get('http://codesign.io/api/folders/'+ activeFolder.id + '/boards?'+qs.stringify({embed: [{l:'boards_codes'}, {l: 'posts'}]})).then((data)=>{
      this.state.boards[activeFolder.id] = data;
      localStorage.boards = JSON.stringify(this.state.boards);
      this.setState({activeBoard: {id: 'new_board'}});
    });
  }


  uploadImage(){

    this.setState({uploadProgress: true});

    chrome.runtime.sendMessage({
      msg: 'uploadImages',
      folders: this.state.folders,
      activeBoard: this.state.activeBoard,
      activeFolder: this.state.activeFolder,

    });
  }

  shareImage(){
    var img = this.state.images.filter((img)=> img.pins)[0];
    var me = this;
    chrome.runtime.sendMessage({
      msg: 'shareImage',
      image: img
    });

    me.setState({currentShareImage: img, shareProgress: true})
  }


  handleRemove(){
    this.state.images.pop();
    localStorage.capturedImages = JSON.stringify(this.state.images);
    if (!this.state.images.length){
      this.props.backToActions();
      chrome.browserAction.setBadgeText({text: ''});
    } else {
      this.setState({})
    }

  }

  toogleSelectors(e){
    if (this.state.uploadProgress) return;
    if (e.target.innerHTML == 'Save'){
      var activeFolder =  this.state.selectActiveFolder

      var activeBoard;
      if (this.refs.boardsSelect.value !== "new_board") {
        activeBoard = this.state.boards[activeFolder.id].filter((b)=> b.id == this.refs.boardsSelect.value)[0];
      } else {
        activeBoard = {id: "new_board"}
      }

      this.setState({activeFolder: activeFolder, activeBoard: activeBoard});
      localStorage.activeFolder =  JSON.stringify(activeFolder);
      localStorage.activeBoard = JSON.stringify(activeBoard);
    } else {
      this.setState({
        selectActiveFolder: this.state.activeFolder
      })
    }

    this.setState({
      edit: !this.state.edit
    })
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

  cleanCapturesList(){
    if (this.state.uploadProgress) return;
    localStorage.capturedImages = '';
    localStorage.currentLiveBoard = '';
    this.props.backToActions();
    chrome.browserAction.setBadgeText({text: ''});
  }

  copytext(text) {
    var textField = document.createElement('textarea');
    textField.innerText = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
  }

  copyLink(){
    var text = this.state.images.filter((img)=> img.sharedLink)[0].sharedLink;
    this.copytext(text);
    this.setState({
      copiedLink: true
    });
    setTimeout(function(){
      this.setState({
        copiedLink: false
      })
    }.bind(this), 3000)
  }

  selectInputText(text,e){
    e.target.selectionStart = 0;
    e.target.selectionEnd = text.length;
  }

  backToAction(){
    if (this.state.uploadProgress) return;
    this.props.backToActions();
  }

  render(){

    var hasPinsImages = this.state.images.filter((img)=> img.pins && img.pins.length).length;

    return (
      <div>
        <div key="screenshot"  className="screenshot">
          {this.state.images.concat([]).reverse().map(function(img, i) {
            return (
              [img.sharedLink ? [<div className="sharedTitle">Share link and disscuss online:</div>,<input disabled="true" onClick={this.selectInputText.bind(this, img.sharedLink)} className="sharedLink" value={img.sharedLink}/>] : null , <div className="image">
                <img onMouseOut={this.hideIcon.bind(this, i)} onMouseMove={this.showIcon.bind(this, i)} key={i} src={img.link}/>
                <div onClick={this.handleRemove.bind(this)} onMouseMove={this.showIcon.bind(this, i)} className="removeIcon" style={{display: this.state.showHideIcon[i] ? 'block' : 'none'}}><div className="icon"></div></div>
              </div>]
            )

          }.bind(this)) }
        </div>
        <div className="uploadWidget">

           <div id="uploadButton" className={hasPinsImages ? "grayButton": null} onClick={this.uploadImage.bind(this)}>{this.state.uploadProgress ? <span>UPLOADING...</span> : <span>SHARE {hasPinsImages ? 'AS' : ''} {this.state.images.length-1 ? this.state.images.length + ' IMAGES' : ' IMAGE'}</span>}</div>
          {this.state.edit ? <div className="selectors">
            <p>FOLDER</p>
            <select defaultValue={this.state.activeFolder.id} ref="foldersSelect" onChange={this.setFolder.bind(this)}>
              {this.state.folders && this.state.folders.map(function(folder, i){
                return <option key={i} value={folder.id}>{folder.title}</option>
              })}
            </select>
            <p>BOARD</p>
            <select defaultValue={this.state.activeBoard.id} ref="boardsSelect">
              <option key="new board" className="new_board_option" value="new_board">Create new board</option>
              {this.state.boards[this.state.selectActiveFolder.id] && this.state.boards[this.state.selectActiveFolder.id].map(function(board,i){
                return <option key={i} value={board.id}>{board.title}</option>
              })}
            </select>
          </div> : <div className="selectors-titles">
            {this.state.activeBoard.id == 'new_board' ?
              <p key="1">{ hasPinsImages && this.state.images.filter((img)=> img.sharedLink).length ? 'Click on "Share” button to upload a full-length screenshot with your feedback to a new board' : ('Click on "Share” button to upload ​'+ (this.state.images.length > 1 ? this.state.images.length + ' images' :  '1 image​ to a new board'))}  in "{this.state.activeFolder.title}" folder.</p> :
              <p key="1">Click on "Share" button to upload {this.state.images.length > 1 ? this.state.images.length + ' images' :  '1 image​'}​ to "{this.state.activeBoard.title}" board in "{this.state.activeFolder.title}" folder.</p>}
          </div>}
          <div className="upload-actions">
            <a onClick={this.toogleSelectors.bind(this)}>{this.state.edit ? 'Save' : 'Edit'}</a>}
            {this.state.edit && <a onClick={()=> this.setState({edit: false})}>Cancel</a>}
            {hasPinsImages ? null :<a onClick={this.backToAction.bind(this)}>+ Snap more</a>}
            <a onClick={this.cleanCapturesList.bind(this)}>x Cancel</a>
          </div>
        </div>
      </div>
    )
  }
}

module.exports = SelectAndUpload
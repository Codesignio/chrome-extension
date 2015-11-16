import React from 'react';
import {request} from './../utils';
import {s3Upload} from './../utils';
import {dataURItoBlob} from './../utils';

export default class SelectAndUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      folders: JSON.parse(localStorage.folders || '[]'),
      boards: JSON.parse(localStorage.boards || '{}'),
      activeBoard: JSON.parse(localStorage.activeBoard || '{"id": "new_board"}'),
      activeFolder: JSON.parse(localStorage.activeFolder || '{"id": -1, "title": "My boards"}'),
      selectActiveFolder: {id: 1, title: "My boards"},
      images: props.images,
    }
  }

  componentWillMount() {
    var token = localStorage.token;
    request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' +  token}, null, function (data1) {
      var activeFolder = data1.results.map((f)=> f.id).indexOf(this.state.activeFolder.id) == -1 ? data1.results.filter((fol) => fol.title == "My boards")[0] : this.state.activeFolder;

      this.setState({
        folders: data1.results,
        activeFolder: activeFolder
      });
      localStorage.folders = JSON.stringify( data1.results);

      request('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data2) {
        var activeBoard = data2.results.map((b)=> b.id).indexOf(this.state.activeBoard.id) == -1 ?  {id: 'new_board'} : this.state.activeBoard;


        this.state.boards[activeFolder.id] = data2.results;
        this.setState({
          activeBoard: activeBoard,
        });
        localStorage.boards = JSON.stringify(this.state.boards);

      }.bind(this))
    }.bind(this));

  }

  setFolder(e) {
    var token = localStorage.token;
    var activeFolder =  this.state.folders.filter((f)=> f.id == parseInt(e.target.value))[0];
    this.setState({selectActiveFolder: activeFolder});
    request('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data) {
      this.state.boards[activeFolder.id] = data.results;
      localStorage.boards = JSON.stringify(this.state.boards);
      this.setState({activeBoard: {id: 'new_board'}});
    }.bind(this));
  }


  uploadImage(){

    chrome.runtime.sendMessage({
      msg: 'uploadImages',
      folders: this.state.folders,
      activeBoard: this.state.activeBoard,
      activeFolder: this.state.activeFolder,

    });
  }

  handleRemove(){
    this.state.images.pop();
    localStorage.capturedImages = JSON.stringify(this.state.images);
    if (!this.state.images.length){
      this.props.backToActions()
    } else {
      this.setState({})
    }

  }

  toogleSelectors(e){
    if (e.target.innerHTML == 'Save'){
      var activeFolder =  this.state.selectActiveFolder

      var activeBoard;
      if (this.refs.boardsSelect.value !== "new_board") {
        activeBoard = this.state.boards[activeFolder.id].filter((b)=> b.id == parseInt(this.refs.boardsSelect.value))[0];
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

  render(){
    return (
      <div>
        <div key="screenshot" className="screenshot">
          {this.state.images.concat([]).reverse().map((img, i) => <div className="image"><img key={i} src={img.link}/><div onClick={this.handleRemove.bind(this)} className="removeIcon"></div></div>)}
        </div>
        <div className="uploadWidget">
          <button id="uploadButton" onClick={this.uploadImage.bind(this)}>UPLOAD {this.state.images.length-1 ? this.state.images.length + ' IMAGES' : null}</button>
          { this.state.edit ? <div className="selectors">
            <p>FOLDER</p>
            <select defaultValue={this.state.activeFolder.id} ref="foldersSelect" onChange={this.setFolder.bind(this)}>
              {this.state.folders && this.state.folders.map(function(folder, i){
                return <option key={i} value={folder.id}>{folder.title}</option>
              })}
            </select>
            <p>BOARD</p>
            <select defaultValue={this.state.activeBoard.id} ref="boardsSelect">
              <option key="new board" className="new_board_option" value="new_board">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Create new board</option>
              {this.state.boards[this.state.selectActiveFolder.id] && this.state.boards[this.state.selectActiveFolder.id].map(function(board,i){
                return <option key={i} value={board.id}>{board.title}</option>
              })}
            </select>
          </div> : <div className="selectors-titles">
            {this.state.activeBoard.id == 'new_board' ? [<p key="1">Wiil creating new board</p>,<p key="2">in folder: "{this.state.activeFolder.title}"</p>] :
              [<p key="1">Upload images to existing "{this.state.activeBoard.title}" board</p>, <p key="2">in "{this.state.activeFolder.title}" folder.</p>]}
          </div>}
          <div className="upload-actions">
            <a onClick={this.toogleSelectors.bind(this)}>{this.state.edit ? 'Save' : 'Edit'}</a>
            {this.state.edit && <a onClick={()=> this.setState({edit: false})}>Cancel</a>}
            <a onClick={()=> this.props.backToActions()}>+ Make one more snap</a>
          </div>
        </div>
      </div>
    )
  }
}
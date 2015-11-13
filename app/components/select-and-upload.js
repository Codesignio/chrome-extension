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
      activeBoard: JSON.parse(localStorage.activeBoard || '{}'),
      activeFolder: JSON.parse(localStorage.activeFolder || '{}')
    }
  }

  componentWillMount() {
    var token = localStorage.token;
    request('http://api.codesign.io/folders/', 'GET', {"Authorization": 'Token ' +  token}, null, function (data1) {
      var folderExist = this.state.activeFolder.id && data1.results.map((f)=> f.id).indexOf(this.state.activeFolder.id) > -1;
      var activeFolder = folderExist ? this.state.activeFolder : data1.results[0];

      this.setState({
        folders: data1.results,
        activeFolder: activeFolder,
        edit: !folderExist
      });
      localStorage.folders = JSON.stringify( data1.results);

      request('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data2) {
        var boardExist = this.state.activeBoard.id && (data2.results.map((b)=> b.id).indexOf(this.state.activeBoard.id) > -1 || this.state.activeBoard.id == 'new_board');
        var activeBoard = boardExist ? this.state.activeBoard : data2.results[0];


        this.state.boards[activeFolder.id] = data2.results;
        this.setState({
          activeBoard: activeBoard,
          edit: !boardExist
        });
        localStorage.boards = JSON.stringify(this.state.boards);

      }.bind(this))
    }.bind(this));

  }

  setFolder(e) {
    var token = localStorage.token;
    var activeFolder =  this.state.folders.filter((f)=> f.id == parseInt(e.target.value))[0];
    this.setState({activeFolder: activeFolder});
    request('http://api.codesign.io/folders/'+ activeFolder.id + '/boards/', 'GET', {"Authorization": 'Token ' + token}, null, function (data) {
      localStorage.activeFolder =  JSON.stringify(activeFolder);
      this.state.boards[activeFolder.id] = data.results;
      localStorage.boards = JSON.stringify(this.state.boards);
      this.setState({activeBoard: data.results[0]});
    }.bind(this));
  }

  setBoard(e) {
    var activeBoard;
      if (e.target.value !== "new_board") {
        activeBoard = this.state.boards[this.state.activeFolder.id].filter((b)=> b.id == parseInt(e.target.value))[0];
      } else {
        activeBoard = {id: "new_board"}
      }
      localStorage.activeBoard = JSON.stringify(activeBoard);
      this.setState({
        activeBoard: activeBoard
      });
  }


  uploadImage(){

    chrome.runtime.sendMessage({
      msg: 'uploadImages',
      folders: this.state.folders,
      activeBoard: this.state.activeBoard,
      activeFolder: this.state.activeFolder,

    });
  }

  handleCancel(){
    this.props.backToActions();
  }

  toogleSelectors(){
    this.setState({
      edit: !this.state.edit
    })
  }

  render(){
    return (
      <div className="uploadWidget">
        <button id="uploadButton" onClick={this.uploadImage.bind(this)}>UPLOAD IMAGES</button>
        { this.state.edit || !this.state.activeFolder.id ? <div className="selectors">
          <p>FOLDER</p>
          <select value={this.state.activeFolder.id} onChange={this.setFolder.bind(this)}>
            {this.state.folders && this.state.folders.map(function(folder, i){
              return <option key={i} value={folder.id}>{folder.title}</option>
            })}
          </select>
          <p>BOARD</p>
          <select value={this.state.activeBoard.id} onChange={this.setBoard.bind(this)}>
            {this.state.boards[this.state.activeFolder.id] && this.state.boards[this.state.activeFolder.id].map(function(board,i){
              return <option key={i} value={board.id}>{board.title}</option>
            })}
            <option key="new board" className="new_board_option" value="new_board">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Create new board</option>
          </select>
        </div> : <div className="selectors-titles">
          {this.state.activeBoard.id == 'new_board' ? [<p key="1">Wiil creating new board</p>,<p key="2">in folder: {this.state.activeFolder.title}</p>] :
            [<p key="1">Folder: {this.state.activeFolder.title}</p>, <p key="2">Board: {this.state.activeBoard.title}</p>]}
        </div>}
        <div className="upload-actions">
          <a onClick={this.toogleSelectors.bind(this)}>{this.state.edit ? 'Save' : 'Edit'}</a>
          <a onClick={this.handleCancel.bind(this)}>Cancel</a>
          <a>+ Make one more snap</a>
        </div>
      </div>
    )
  }
}
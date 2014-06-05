var Table = require('cli-table');
var keypress = require('keypress');
var util = require('util');
var exec = require('child_process').exec;
var clipboard = require('node-clipboard');

var torrent = require('./torrent');

var torrentCLI = function(){
  
  this.torrents = [];
 
  this.addTorrent = function(){
    var mag = clipboard.read();
    console.log(mag);
  };
  
  var version = function() { return '0.0.1';}

  var createRow = function(torrent) {
  
    var row = new Table({
      head: ['name', 'size', "% dl'd", 'seeders'],
      chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
         , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
         , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
         , 'right': '║' , 'right-mid': '╢' , 'middle': '│' },
      colWidth: [30,20,20,20]
    });
    row.push([torrent.name,torrent.size,torrent.percentDone.toFixed(3) + "%", torrent.seeders]);
    return row.toString();
    
  };
  
  var updateUI = function(){
    
    exec('clear', function(error, stdout, stderr){
      
          util.puts(stdout);
          
          var mainWindow = new Table({
          head: ['torrentCLI ' + version() + ' (a)Add Torrent from clipboard (k)Show hotkeys']
        , colWidths: [70],
          chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
           , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
           , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
           , 'right': '║' , 'right-mid': '╢' , 'middle': '│' },
        });
        // table is an Array, so you can `push`, `unshift`, `splice` and friends
        for(var i =0 ; i < this.torrents.length; i++){
          this.torrents[i].percentDone += (Math.random() * 0.1);
          mainWindow.push(
               [createRow(this.torrents[i])]
           );
        }

        console.log(mainWindow.toString());
        
      }.bind(this));
      
  }.bind(this);
  
  this.interval = setInterval(function(){
    updateUI();
  }.bind(this), 1500);

};

var cli = new torrentCLI();

  //make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on('keypress', function (ch, key) {
  console.log('got "keypress"', key);
  switch(key.name){
    case 'a'://add
      cli.addTorrent();
      break;
    case 'k'://show options
      cli.showOptions();
      break;
  }
  
  
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
    clearInterval(cli.interval);
  }
  
});

process.stdin.setRawMode(true);
process.stdin.resume();
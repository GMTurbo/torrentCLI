var Table = require('cli-table');
var keypress = require('keypress');
var util = require('util');
var exec = require('child_process').exec;
var utils = require('./utils');
//var clipboard = require('clipboard');

var torrent = require('./torrent');

var argv = require("rc")("torrentCLI");

// Alias long options
if(argv.connections) argv.c = argv.connections;
if(argv.dht) argv.d = argv.dht;
if(argv.ephemeral) argv.e = argv.ephemeral;
if(argv.idle) argv.i = argv.idle;
if(argv.listen) argv.l = argv.listen;
if(argv.peer) argv.p = argv.peer;
if(argv.quiet) argv.q = argv.quiet;
if(argv.stream) argv.s = argv.stream;
if(argv.notracker) argv.t = argv.notracker;
if(argv.uploads) argv.u = argv.uploads;
if(argv.wait) argv.w = argv.wait;

var torrentCLI = function(){

  this.torrents = [];

  this.addTorrent = function(){
    var mag = require("copy-paste").paste();
    this.torrents.push(new torrent());
    this.torrents[this.torrents.length-1].load(mag, argv, torCb.bind(this));
  };

  var version = function() { return '0.0.1';};

  var createRow = function(torrent) {

    var row = new Table({
      head: ['name', 'size', "% complete", 'Downloaded', 'speed', 'seeders'],
      chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗',
         'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝',
         'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼',
         'right': '║' , 'right-mid': '╢' , 'middle': '│' },
      colWidth: [30,20,20,20,20]
    });
    row.push([utils.fill(torrent.name(),30),
              torrent.size(),
              torrent.ready ? utils.pad(torrent.downloadPercent(), 3) + "%": torrent.message,
              utils.bytes(torrent.downloadedBytes()),
              utils.bytes(torrent.downloadSpeed()),
              torrent.seeders()]);
    return row.toString();

  };

  var updateUI = function(){

    exec('clear', function(error, stdout, stderr){

          util.puts(stdout);

          var mainWindow = new Table({
          head: ['torrentCLI ' + version() + ' (a)Add Torrent from clipboard (k)Show hotkeys'],
          colWidths: [100],
          chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗',
           'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝',
           'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼',
           'right': '║' , 'right-mid': '╢' , 'middle': '│' },
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
    process.exit(0);
  }

});

process.stdin.setRawMode(true);
process.stdin.resume();


//
// Torrent download mode
//
var torCb = function(torrent, self) {
    // Missing or invalid argument
    if(!torrent) {
        console.error("Usage: tget <path|url|magnet> [options]");
        return;
    }

    self.message = "loading...";

    self.init(torrent);

    // Exit safety check
    function exit(force) {
        TorrentEngine.exit(function() {
            process.exit(0);
        });
    }

    self.message = "Initializing torrent...";

    self.on("ready", function() {

    });
};

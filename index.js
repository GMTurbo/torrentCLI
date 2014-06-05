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
    row.push([torrent.name().substring(0,30),
              torrent.size(),
              torrent.ready() ? utils.pad(torrent.downloadPercent(), 3) + "%": torrent.message,
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

    // Create command line interface
    // var rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // });
    //
    // // Forceful exit
    // rl.on("SIGINT", function() {
    //     exit(true);
    // });
    //
    // rl.setPrompt("");
    self.message = "Initializing torrent...";

    self.on("ready", function() {
        // if(verbose) {
        //     rl.write(" Ready.\n\n");
        //
        //     rl.write("Downloading files:\n");
        //     self.files.forEach(function(file, i) {
        //         rl.write("  [" + (i+1) + "] " + file.path + "\n");
        //     });
        //
        //     rl.write("\n");
        // }

        // function print_progress() {
        //     var buf = [];
        //
        //     // Percent indicator
        //     var percent = self.downloadPercent();
        //     // buf.push(utils.pad(percent, 3) + "%");
        //     // buf.push(" ");
        //     //
        //     // // Progress bar
        //     // var twens_percent = Math.floor(percent*2.5/10);
        //     // buf.push("[");
        //     // buf.push("==============================".slice(0, twens_percent));
        //     // buf.push(twens_percent ? ">" : " ");
        //     // buf.push("                              ".slice(0, 25-twens_percent));
        //     // buf.push("]");
        //     // buf.push("  ");
        //     //
        //     // // Downloaded bytes
        //     // buf.push(utils.bytes(TorrentEngine.downloadedBytes()));
        //     // buf.push("  ");
        //     //
        //     // // Download speed
        //     // buf.push(utils.bytes(TorrentEngine.downloadSpeed()));
        //     // buf.push("/s");
        //     // buf.push("  ");
        //     //
        //     // // Peers informations
        //     // function active(wire) {
        //     //     return !wire.peerChoking;
        //     // }
        //     //
        //     // buf.push(TorrentEngine.wires.filter(active).length);
        //     // buf.push("/");
        //     // buf.push(TorrentEngine.wires.length);
        //     // buf.push(" peers");
        //     // buf.push("  ");
        //     //
        //     // // Stream informations
        //     // if(StreamServer.enabled) {
        //     //     buf.push(StreamServer.open_streams);
        //     //     buf.push(" streams");
        //     // }
        //     //
        //     // rl.write(buf.join(""));
        // }

        // function clear_line() {
        //     // Erase the last printed line
        //     //rl.write("", { ctrl: true, name: "u" });
        // }
        //
        // var throttle = false;
        // function update_gui(done) {
        //     if(done || !throttle) {
        //         clear_line();
        //         print_progress();
        //         throttle = true;
        //         setTimeout(function() {
        //             throttle = false;
        //         }, 1000);
        //     }
        // }

        // if(verbose) setInterval(update_gui, 1000);
        //
        // // Download is fully done
        // self.on("done", function() {
        //     if(verbose) update_gui(true);
        //     exit(false);
        // });
        //
        // // Init streaming server
        // if(argv.s) {
        //     StreamServer.init(argv.s, TorrentEngine.files);
        //
        //     if(verbose) {
        //         rl.write("Streaming enabled on port " + StreamServer.port);
        //         rl.write(" (default file is " + StreamServer.def_idx + ")\n\n");
        //     }
        //
        //     StreamServer.on("stream-close", function() {
        //         exit(false);
        //     });
        // }
        //
        // // Initial progress bar painting
        // if(verbose) update_gui();
    });
};

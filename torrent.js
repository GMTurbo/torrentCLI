/*
    Copyright (c) 2014 Bastien Clément

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be included
    in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var fs = require("fs");
var path = require("path");
var events = require("events");
var crypto = require("crypto");
var mkdirp = require("mkdirp");
var torrentStream = require("torrent-stream");

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var TorrentEngine = function(){

  this.status = 'loading';
  this.ready = false;
  this.done = false;
  this.opts = {
      connections: 100,
      uploads: 10,
      path: process.cwd(),
      verify: true,
      dht: 10000,
      tracker: true,
      name: "torrentCLI"
  };
  this.total_pieces = 0;
  this.finished_pieces = 0;
  this.connect = [];

  var engine;
  var ephemeral = false;
  var wait = false;
  var download_snapshot = 0;

  this.magnet = '';

  var checkDone = function () {
      if(this.finished_pieces == this.total_pieces) {
          this.done = true;
          this.emit("done");
      }
  }.bind(this);

  this.load = function(torrent, opts, cb) {
      // Missing argument
      if(!torrent) {
          return cb(null);
      }

      // Options
      if(opts.c) { this.opts.connections = opts.c; }
      if(opts.d) { this.opts.dht = (!opts.d || opts.d === true) ? false : opts.d; }
      if(opts.t) { this.opts.tracker = false; }
      if(opts.u) { this.opts.uploads = opts.u; }
      if(opts.w) { wait = true; }

      if(opts.e) {
          ephemeral = true;
          this.opts.path = null;  // Will download to /tmp
      }

      if(opts.p) {
          if(Array.isArray(opts.p)) {
              this.connect = opts.p;
          } else {
              this.connect.push(opts.p);
          }
      }

      // Magnet link
      if(torrent.slice(0, 7) == "magnet:") {
          this.magnet = torrent;
          return cb(torrent, this);
      }

      // HTTP link
      var https = torrent.slice(0, 8) == "https://";
      if(https || torrent.slice(0, 7) == "http://") {
          var http = require(https ? "https" : "http");
          http.get(torrent, function(res) {
              var buffers = [];

              res.on("data", function(data) {
                  buffers.push(data);
              });

              res.on("end", function() {
                  cb(Buffer.concat(buffers));
              });
          });
          return;
      }

      // Attempt to read a local file
      return cb(fs.readFileSync(torrent, this));
  };

  this.init = function(torrent, opts) {
      // TorrentStream instance
      this.engine = engine = torrentStream(torrent, opts || this.opts);
      this.status = 'initiliazing...';
      // if(opts.l) {
      //     engine.listen(opts.l);
      // }

      // Explicit peer connection
      this.connect.forEach(function(peer) {
          engine.connect(peer);
      });

      var self = this;

      // Wait for torrent metadata to be available
      engine.on("ready", function() {
          self.ready = true;
          self.total_pieces = engine.torrent.pieces.length;
          self.torrent = engine.torrent;
          self.wires = engine.swarm.wires;
          self.files = engine.files.filter(function(file) {
              // TODO: maybe a filtering option
              return true;
          });

          // Start the download of every file (unless -w)
          //if(!wait) {
          engine.files.forEach(function(file) {
              file.select();
          });
          //}

          // Resuming a download ?
          for(var i = 0; i < self.total_pieces; i++) {
              if(engine.bitfield.get(i)) {
                  ++self.finished_pieces;
              }
          }
          
          checkDone();

          self.status = 'downloading';

          // New piece downlaoded
          engine.on("verify", function() {
              download_snapshot = engine.swarm.downloaded;
              ++self.finished_pieces;
              checkDone();
          });

          // Pause or resume the swarm when interest changes
          engine.on("uninterested", function() { engine.swarm.pause(); });
          engine.on("interested", function() { engine.swarm.resume(); });

          // We're ready
          self.emit("ready");
      });
  };

  this.downloadPercent = function() {
      // Return range: 0-100
      return Math.floor((this.finished_pieces/this.total_pieces) * 100);
  };

  this.downloadSpeed = function() {
      return engine.swarm.downloadSpeed();
  };

  this.downloadedBytes = function() {
    var ret = 0;
    try{
      ret = (this.finished_pieces * engine.torrent.pieceLength) + (engine.swarm.downloaded - download_snapshot);
    }catch(e){

    }
    return ret;
  };

  this.name = function() { return engine.torrent ? engine.torrent.name : 'unknown'; };

  this.size = function() { return '~'; };

  this.seeders = function () {
      if(!this.wires) return "0/0";
      function active(wire) {
          return !wire.peerChoking;
      }

      return this.wires.filter(active).length + "/" + this.wires.length + " peers";
  };

  var paused = false;

  this.toggleRunState = function(){

      paused = !paused;

      engine.files.forEach(function(file) {
          paused ?
          function(){
            file.deselect();
            engine.swarm.pause();
          }() :
          function(){
            file.select();
            engine.swarm.resume();
          }();
      });

      this.status = paused ? 'paused' : 'downloading';

  };

  this.exit = function(cb) {
      engine.destroy(function() {
          if(ephemeral || this.done) {
              engine.remove(!ephemeral, function() {
                  cb();
              });
          } else {
              cb();
          }
      });
  };

};

util.inherits(TorrentEngine, EventEmitter);

module.exports = TorrentEngine;

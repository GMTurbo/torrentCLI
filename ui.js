/**
 * false - a bitcoin wallet for your terminal
 * Copyright (c) 2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/false
 */

/**
 * Exports
 */

var ui = exports;

/**
 * Modules
 */

var fs = require('fs')
  , cp = require('child_process');

/**
 * Dependencies
 */

var blessed = require('blessed');
var utils = require('./utils');
/**
 * Load
 */

// var termcoin = require('./')
//   , utils = termcoin.utils
//   , config = termcoin.config
//   , mock = termcoin.mock
//   , transforms = termcoin.transforms
//   , bitcoin = termcoin.bitcoin
//   , opt = config.opt
//   , platform = config.platform
//   , blockchain = require('./explore/blockchain');
//
// var coined = require('coined')
//   , bcoin = coined.bcoin
//   , bn = coined.bn;

var setImmediate = typeof global.setImmediate !== 'function'
  ? process.nextTick.bind(proccess)
  : global.setImmediate;

/**
 * Variables
 */

ui.decryptTime = 0;
ui.lock = false;
ui.sep = ' │ ';

/**
 * Start
 */

ui.start = function(stats, callback) {
  var screen = blessed.screen({
    autoPadding: true,
    fastCSR: true,
    log: process.cwd() + '/debug.ui.log'
  });

  //termcoin.screen = screen;

  screen._.target = null;

  screen._.wrapper = blessed.box({
    parent: screen,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  });

  screen._.bar = blessed.listbar({
    parent: screen._.wrapper,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    keys: true,
    mouse: true,
    autoCommandKeys: true,
    style: {
      item: {
        fg: 'blue',
        hover: {
          fg: 'white',
          bg: 'black'
        }
      },
      selected: {
        fg: 'white',
        bg: 'black'
      },
      prefix: {
        fg: 'white'
      }
    }
  });

  screen.on('prerender', function() {
    screen._.bar.setContent(utils.pad(screen.width));
  });

  screen._.sep = blessed.line({
    parent: screen._.wrapper,
    top: 1,
    left: 0,
    right: 0,
    orientation: 'horizontal'
  });

  var tabs = screen._.tabs = {};

  ['torrents',
   'settings'].forEach(function(name) {
    //if (name === 'debug' && !termcoin.config.debug) {
      //return;
    //}

    var tab = tabs[name] = blessed.box({
      top: 2,
      left: 0,
      right: 0,
      bottom: 0,
      scrollable: true,
      keys: true,
      vi: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' '
      },
      style: {
        scrollbar: {
          inverse: true
        }
      }
    });

    screen._.bar.addItem({
      text: name,
      callback: function() {
        // if (screen._.msg) screen._.msg.hide();
        if (screen._.target) screen._.target.detach();
        screen._.wrapper.append(tab);
        tab.focus();
        screen._.target = tab;
        screen.render();
      }
    });
  });

  //screen._.bar.commands[0].callback();

  /**
   * Overview
   */

  tabs.torrents._.wallet = blessed.text({
    parent: tabs.torrents,
    top: 0,
    left: 3,
    height: 'shrink',
    width: '40%',
    label: ' {blue-fg}Wallet{/blue-fg} ',
    tags: true,
    border: {
      type: 'line'
    },
    content: 'No balance.',
    tags: true
  });

  tabs.torrents._.transactions = blessed.text({
    parent: tabs.torrents,
    top: 0,
    right: 3,
    height: 'shrink',
    label: ' {blue-fg}Transactions{/blue-fg} ',
    tags: true,
    border: {
      type: 'line'
    },
    content: 'No transactions.',
    tags: true
  });

  screen.on('resize', function callee() {
    if (screen.width < 103) {
      tabs.torrents._.transactions.width = '40%';
      //tabs.torrents._.transactions.shrink = false;
      screen.render();
      return callee;
    }
    tabs.torrents._.transactions.width = undefined;
    delete tabs.torrents._.transactions.position.width;
    //tabs.torrents._.transactions.shrink = true;
    screen.render();
    return callee;
  }());

  tabs.torrents._.data = blessed.box({
    parent: tabs.torrents,
    bottom: 0,
    left: 3,
    height: 'shrink',
    width: '40%',
    label: ' {blue-fg}Data{/blue-fg} ',
    tags: true,
    border: 'line',
    content: 'Loading... ',
    style: {
      fg: 'lightblack',
      bar: {
        bg: 'blue'
      }
    }
  });

  tabs.torrents._.bar = blessed.progressbar({
    parent: tabs.torrents._.data,
    top: 3,
    left: 0,
    right: 0,
    height: 'shrink',
    orientation: 'horizontal',
    filled: 0,
    ch: '|',
    tags: true,
    //content: 'Syncing... ',
    style: {
      fg: 'lightblack',
      bar: {
        bg: 'blue'
      }
    }
  });


  /**
   * Debug
   */

  if (false) {
    tabs.debug._.data = blessed.text({
      parent: tabs.debug,
      top: 0,
      left: 3,
      height: 'shrink',
      width: 'shrink',
      content: '',
      tags: true
    });
  }

  /**
   * Global Widgets
   */

  screen._.prompt = blessed.prompt({
    parent: screen,
    top: 'center',
    left: 'center',
    height: 'shrink',
    width: 'shrink',
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    content: 'Label:',
    border: 'line',
    hidden: true
  });

  screen._.prompt._.input.key('C-e', function() {
    if (!screen.focused || screen.focused !== screen._.prompt._.input) {
      return;
    }
    var selected = tabs.misc._.list.selected;
    screen._.prompt._.cancel.press();
    return pickAddress(function(err, address, label) {
      if (err) return screen._.msg.error(err.message);
      if (address == null) return screen.render();
      tabs.misc._.list.emit('select', tabs.misc._.list.items[selected], selected);
      screen._.prompt._.input.setValue(address);
      return screen.render();
    });
  });

  screen._.question = blessed.question({
    parent: screen,
    top: 'center',
    left: 'center',
    width: 'shrink',
    height: 'shrink',
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    content: 'Label:',
    border: 'line',
    hidden: true
  });

  screen._.fm = blessed.filemanager({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '70%',
    height: '50%',
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    label: ' Choose a file... ',
    border: 'line',
    hidden: true
  });

  screen._.picker = blessed.list({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '70%',
    height: '50%',
    border: 'line',
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    hidden: true,
    style: {
      scrollbar: {
        inverse: true
      },
      selected: {
        bg: 'blue'
      },
      item: {
        hover: {
          bg: 'blue'
        }
      }
    },
    scrollbar: {
      ch: ' '
    }
  });

  /**
   * Loader
   */

  screen._.loader = blessed.loading({
    parent: screen,
    top: 'center',
    left: 'center',
    height: 5,
    align: 'center',
    width: '50%',
    tags: true,
    hidden: true,
    border: 'line'
  });

  /**
   * Message
   */

  screen._.msg = blessed.message({
    parent: screen,
    top: 'center',
    left: 'center',
    // Fixed in blessed:
    // height: '50%',
    height: 'shrink',
    width: '50%',
    align: 'center',
    tags: true,
    hidden: true,
    border: 'line',
    ignoreKeys: ['q']
  });

  /**
   * Details
   */

  screen._.details = blessed.message({
    parent: screen,

    // Fixed in blessed.
    // top: 'center',
    // left: 'center',
    // height: 'shrink',
    // width: 'shrink',

    //top: 2,
    //left: 4,
    //right: 4,
    //bottom: 2,

    top: 'center',
    left: 'center',
    width: '70%',
    height: '50%',

    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    hidden: true,
    border: 'line',
    scrollbar: {
      ch: ' '
    },
    style: {
      scrollbar: {
        bg: 'blue'
      }
    }
  });

  /**
   * QR Box
   */

  screen._.qrbox = blessed.box({
    parent: screen,
    scrollable: true,
    alwaysScroll: true,
    //top: 0,
    //left: 0,
    //bottom: 0,
    //right: 0,

    top: 1,
    bottom: 1,
    width: 80 + 6,
    //width: 'shrink',
    left: 'center',
    border: 'line',

    align: 'center',
    tags: true,
    hidden: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: ' '
    },
    style: {
      scrollbar: {
        inverse: true
      }
    }
  });

  screen._.qrbox._.show = function(content) {
    screen.saveFocus();
    screen._.qrbox.focus();
    screen._.qrbox.setScroll(0);
    screen._.qrbox.setContent(content);
    screen._.qrbox.show();
    screen.render();
  };

  screen._.qrbox.key(['q', 'escape'], function() {
    screen._.qrbox.hide();
    screen.restoreFocus();
    screen.render();
  });

  //if (!stats.encrypted) {
    screen._.msg.display('Welcome to {blue-fg}termcoin{/blue-fg}!', 2);
  //}

  function checkEncrypt(callback) {
    //if (!stats.encrypted) {
      //return callback();
    //}

    if (ui.decryptTime && ui.decryptTime + 60 * 60 * 1000 > Date.now()) {
      return callback();
    }

    screen._.prompt._.input.censor = true;
    return screen._.prompt.type('Enter your passphrase (valid for 60 min):', '', function(err, value) {
      screen._.prompt._.input.censor = false;
      if (err) {
        screen.render();
        return callback(err);
      }
      if (value == null) {
        return screen.render();
      }
      return bitcoin.forgetKey(function() {
        return bitcoin.decryptWallet(value, 60 * 60, function(err) {
          if (err) {
            screen.render();
            return callback(err);
          }
          ui.decryptTime = Date.now();
          screen.render();
          return callback(null);
        });
      });
    });
  }

  function refresh(callback, showLoad) {
    if (refresh.lock) {
      if (callback) callback();
      return;
    }

    var done = function(err) {
      refresh.lock = false;
      if (!callback) return;
      return err
        ? callback(err)
        : callback();
    };

    refresh.lock = true;

    // Disable this functionality:
    // showLoad = false;
    refresh.lock = false;

    if (ui.lock) return done();

    if (screen._.prompt.visible
        || screen._.question.visible
        || screen._.msg.visible
        || screen._.loader.visible) {
      showLoad = false;
    }

    if (showLoad) {
      screen._.loader.load('Loading...');
    }
  }

  screen.key('f5', function() {
    return refresh(null, true);
  });

  (function callee() {
    return refresh(function() {
      return setTimeout(callee, 10 * 1000);
    });
  })();

  screen.on('element keypress', function(el, ch, key) {
    var _ = screen._;

    if (ch !== 'q') return;

    if (screen.grabKeys) return;

    if (el === _.question
        || el === _.prompt
        || el === _.msg
        || el === _.details
        || el === _.qrbox
        || el === _.fm
        || el === _.picker) {
      return;
    }

    var explore = screen._.tabs.explore
      , data = explore._.data
      , block = (explore._.block || {})._hash
      , last = (blockchain.lastBlock || {})._hash;

    if (el === data && (explore._.tx || explore._.addr || block !== last)) {
      return;
    }

    if (_.msg.visible) {
      _.msg.hide();
      screen.render();
      return;
    }

    return exit();
  });

  screen.ignoreLocked.push('C-c');

  screen.key('C-c', function(ch, key) {
    return exit();
  });

  function exit() {
    // if (bitcoin.startServer.started) {
    //   return bitcoin.stopServer(function() {
    //     return callback();
    //   });
    // }

    return callback();
  }

  screen.render();
};

/**
 * UI Helpers
 */

ui.copy = function(text, callback) {
  var callback = callback || function() {};

  function exec(args) {
    var file = args.shift();
    var ps = cp.spawn(file, args, {
      stdio: ['pipe', 'ignore', 'ignore']
    });
    ps.stdin.on('error', callback);
    ps.on('error', callback);
    ps.on('exit', function(code) {
      return callback(code !== 0 ? new Error('Exit code: ' + code) : null);
    });
    ps.stdin.end(text + '');
  }

  if (opt.remote) return callback();

  // X11:
  return exec(['xsel', '-i', '-p'], function(err) {
    if (!err) return callback(null);
    return exec(['xclip', '-i', '-selection', 'primary'], function(err) {
      if (!err) return callback(null);
      // Mac:
      return exec(['pbcopy'], function(err) {
        if (!err) return callback(null);
        return callback(new Error('Failed to set clipboard contents.'));
      });
    });
  });
};

// `tail -f` a file.
ui.tailf = function(file) {
  var self = this
    , StringDecoder = require('string_decoder').StringDecoder
    , decode = new StringDecoder('utf8')
    , buffer = new Buffer(64 * 1024)
    , Stream = require('stream').Stream
    , s = new Stream
    , buff = ''
    , pos = 0;

  s.readable = true;
  s.destroy = function() {
    s.destroyed = true;
    s.emit('end');
    s.emit('close');
  };

  fs.open(file, 'a+', 0644, function(err, fd) {
    if (err) {
      s.emit('error', err);
      s.destroy();
      return;
    }

    (function read() {
      if (s.destroyed) {
        fs.close(fd);
        return;
      }

      return fs.read(fd, buffer, 0, buffer.length, pos, function(err, bytes) {
        if (err) {
          s.emit('error', err);
          s.destroy();
          return;
        }

        if (!bytes) {
          if (buff) {
            stream.emit('line', buff);
            buff = '';
          }
          return setTimeout(read, 1000);
        }

        var data = decode.write(buffer.slice(0, bytes));

        s.emit('data', data);

        var data = (buff + data).split(/\n+/)
          , l = data.length - 1
          , i = 0;

        for (; i < l; i++) {
          s.emit('line', data[i]);
        }

        buff = data[l];

        pos += bytes;

        return read();
      });
    })();
  });

  return s;
};

function tailBox(file, box) {
  var stream = ui.tailf(file)
    , rendering;

  var lines = [];

  stream.on('line', function(line) {
    box.pushLine(line);
    if (box._clines.fake.length > 200) {
      //box.setContent('');
      box.shiftLine(100);
    }
    if (rendering) return;
    rendering = true;
    setImmediate(function() {
      rendering = false;
      //box.setScroll(box.getScrollHeight());
      box.setScroll(box._clines.length);
      box.screen.render();
    });
  });

  return stream.destroy.bind(stream);
}

/**
 * Main
 */

// ui.main = function(callback) {
//   return bitcoin.startServer(function(err) {
//     if (err) return callback(err);
//     return bitcoin.getStats(function(err, stats) {
//       if (err) return callback(err);
//       return ui.start(stats, function(err) {
//         if (err) return callback(err);
//         return callback();
//       });
//     });
//   });
// };

ui.start(null,function(){console.log('callback');});

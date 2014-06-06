# torrentCLI
[![torrentCLI](https://raw.githubusercontent.com/GMTurbo/torrentCLI/master/screens/torrentCLI%20screen1.png)](https://github.com/GMTurbo/torrentCLI)

A command line tool for downloading and managing torrents (for Node.js)

This project wouldn't exist without extensive dissection of [tget](https://github.com/galedric/tget). I highly recommend everyone check it out.
Open-source for the win!
# Goal

Create a simple cli tool that allows one to add, remove, pause, resume torrents through a CLI.

# methods

```
var cli = require('torrentCLI');
```
##var cli = new torrentCLI();
create a new instance of the CLI

# how to use

//THIS IS STILL A WORK IN PROGRESS
##Add
to add a torrent to the cli, have the *magnet link copied to your clipboard* then press 'a'.

##Pause/Resume
select the torrent you want to pause/resume by pressing the up and down arrows, then press 'p'

##implemented
add, pause, resume,
##not implemented
remove, delete

# install

With [npm](https://npmjs.org) do:

```
npm install torrentCLI
```
to get the library.

# license

MIT

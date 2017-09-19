var walk    = require('walk');
var walker  = walk.walk("./mp3", { followLinks: false });
var files   = [], filetag = [];
var playIndex = 0;

var app = require('http').createServer(handler)
var io = require('socket.io').listen(app)
var static = require('node-static');
app.listen('8000');
var server = new static.Server('./web');

var id3 = require('id3js');

function handler (req, res) {
    console.log(req.url);
    server.serve(req, res, function (err, result) {
    	if (err) console.log('fileServer error: ',err);
    });
}


walker.on('file', function(root, stat, next) {
    // Add this file to the list of files
    if (stat.name.indexOf(".mp3") == stat.name.length - 4) {
      files.push(root + '/' + stat.name);
      id3({ file: root + '/' + stat.name, type: id3.OPEN_LOCAL }, function(err, tags) {
        // console.log(tags)
        filetag.push(tags)
      });
    }
    next();
});

walker.on('end', function() {
    // socket.emit(files);
});

var MPlayer = require('mplayer');
 
var player = new MPlayer();

player.setOptions({
    cache: 128,
    cacheMin: 1
});

//player.openFile('./crowd-cheering.mp3');

player.on('start', console.log.bind(this, 'playback started'));
player.on('status', console.log);

io.sockets.on('connection', function (socket) {

	player.on('status', function(status) {
		socket.emit('status', status)
	});

	player.on('time', function (time) {
		socket.emit('time', time)
	});

	socket.on('play', function(index) {
		play(index);
	})

	socket.on('random', function(data) {
		random();
	})

	function play(index) {
		playIndex = index;
		console.log('playing');
		player.openFile(files[index]);
		io.sockets.emit('playing', playIndex)
	}

	function random() {
		var index = Math.floor(Math.random()*files.length);
                play(index);

	}

	socket.on('refresh', function (data) {
		socket.emit('files', files);
		socket.emit('filestag', filetag);
		io.sockets.emit('playing', playIndex)
	});

	socket.on('stop', function (data) {
		player.stop();
	});

	socket.on('volume', function (vol) {
		player.volume(vol)
	});

	socket.on('seek', function (seekpercent) {
                player.seekPercent(seekpercent)
        });

        socket.on('pause', function (data) {
                player.pause()
        });

        socket.on('seek', function (seekpercent) {
                player.seekPercent(seekpercent)
        });


});

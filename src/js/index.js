window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../node_modules/backbone/node_modules/underscore/underscore.js');

function Main(){
    this.genres = [];
    this.artists = [];
    this.albums = [];
    this.songs = [];
    this.errorCount = 0;
    //chrome.sockets.tcpServer.create(this.onSocketCreate.bind(this));
    this.getMediaFileSystems();
};

Main.prototype.onSocketCreate = function(createInfo){
    console.log('create', createInfo);
    this.socketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(createInfo.socketId, '0.0.0.0', 9800, null, this.onSocketListen.bind(this));
}

Main.prototype.onSocketListen = function(result){
    console.log('onSocketListen', result);
    chrome.sockets.tcpServer.onAccept.addListener(this.onSocketAccept.bind(this));
    chrome.sockets.tcpServer.onAcceptError.addListener(this.onSocketAcceptError.bind(this));
    chrome.sockets.tcp.onReceive.addListener(this.onSocketReceive.bind(this));
}

Main.prototype.onSocketAccept = function(info){
    console.log('onSocketAccept', info); 
    chrome.sockets.tcp.setPaused(info.clientSocketId, false, this.onUnPause.bind(this)) 
}

Main.prototype.onSocketAcceptError = function(info){
    console.log('onSocketAcceptError', info);  
}

Main.prototype.onSocketReceive = function(info){
    console.log('onSocketReceive', info);  
    var str = this.arrayBufferToString(info.data);
    console.log('got str:', str);
    chrome.sockets.tcp.send(info.socketId, info.data, function(sendInfo){
        console.log('sendInfo', sendInfo);
        chrome.sockets.tcp.close(info.socketId, function(){
            console.log('close:', info.socketId);
        })
    })
}


Main.prototype.onUnPause = function(){
    console.log('onUnPause');
    chrome.sockets.tcpServer.getInfo(this.socketId, function(info){
        console.log('info', info);
    })
}

Main.prototype.arrayBufferToString = function(buffer) {
    var str = '';
    var uArrayVal = new Uint8Array(buffer);
    for(var s = 0; s < uArrayVal.length; s++) {
        str += String.fromCharCode(uArrayVal[s]);
    }
    return str;
};

Main.prototype.getMediaFileSystems = function(){
    chrome.mediaGalleries.getMediaFileSystems(null, this.onMediaFileSystems.bind(this));
}

Main.prototype.onMediaFileSystems = function(mediaFileSystems){
    mediaFileSystems.forEach(function(item, indx, arr) {
         var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
         if(mData.name === 'iTunes'){
             //console.log('got it', mData);
             this.readDir(item);
         }
    }.bind(this));
}

Main.prototype.readDir = function(fs) {
    var dirReader = fs.root.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            results.forEach(function(item, index){
                //console.log(item);
                if(item.name === "iTunes Music Library.xml"){
                    this.readFile(item);
                }
                if(item.name === "iTunes Media"){
                    this.itunesDir = item;
                }
            }.bind(this))
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}

Main.prototype.readItunesDir = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            results.forEach(function(item, index){
                if(item.name === "Music"){
                    this.readMusicDirs(item);
                }
            }.bind(this))
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}

Main.prototype.readMusicDirs = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            this.readMusicFiles(results[0]);
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}

Main.prototype.readMusicFiles = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            this.getMusicFiles(results[0]);
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}

Main.prototype.getMusicFiles = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            console.log(results);
            results[0].getMetadata(
                function(m){
                    //console.log('metadata', m);
                }
            );
            var fullPaths = _.pluck
                (
                    results,
                    'fullPath'
                );
            console.log(fullPaths);
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}

Main.prototype.readFile = function(fileEntry){
    fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
            this.parseXML(e.target.result);
        }.bind(this);
        reader.readAsText(file);
    }.bind(this), null);
}

Main.prototype.parseXML = function(str){
    var parser = new DOMParser();
    xml = parser.parseFromString(str,"text/xml");
    console.log(xml);
    var root = xml.getElementsByTagName('plist')[0]; // get plist root
    var dicts = root.getElementsByTagName('dict');
    var tracksDict = dicts[1];
    var trackDicts = tracksDict.getElementsByTagName('dict');
    _.each(
        trackDicts,
        function(dict){
            var keys = dict.getElementsByTagName('key');
            var song = {};
            _.each(
                keys,
                function(key){
                    var innerHTML = key.innerHTML;
                    var nextSiblingInnerHTML = key.nextSibling.innerHTML;
                    switch(innerHTML){ // set attributes on Song object
                        case 'Track ID':
                            song.id = nextSiblingInnerHTML;
                        break;
                        case 'Artist':
                            song.artist = nextSiblingInnerHTML;
                            song.artist = song.artist.replace(/&amp;/g, "&");
                        break;
                        case 'Album':
                            song.album = nextSiblingInnerHTML;
                            song.album = song.album.replace(/&amp;/g, "&");
                        break;
                        case 'Genre':
                            song.genre = nextSiblingInnerHTML;
                        break;
                        case 'Name':
                            song.title = nextSiblingInnerHTML;
                        break;
                        case 'Location':
                            var location = nextSiblingInnerHTML;
                            var lastSlash = location.lastIndexOf('/');
                            var fileName = location.slice(lastSlash + 1);
                            fileName = fileName.replace(/%20/g," ");
                            fileName = fileName.replace(/:/g,"_");
                            fileName = fileName.replace(/\//g,"_");
                            fileName = fileName.replace(/&amp;/g, "&");
                            var artist = song.artist;
                            if(artist){
                                artist = artist.replace(/%20/g," ");
                                artist = artist.replace(/:/g,"_");
                                artist = artist.replace(/\//g,"_");
                            }
                            var album = song.album;
                            if(album){
                                album = album.replace(/%20/g," ");
                                album = album.replace(/:/g,"_");
                                album = album.replace(/\//g,"_");
                            }
                            song.url = '/iTunes Media/Music/' + artist + '/' + album + '/' + fileName;
                        break;
                        default:
                        break;
                    }
                }.bind(this)
            );
            this.songs.push(song);
        }.bind(this)
    );
    this.sortLists(this.songs);
    console.log('songs:', this.songs.length, this.songs[80]);
    this.readItunesDir(this.itunesDir);
    //this.getFileUrl(this.songs[0].url);
}

Main.prototype.sortLists = function(){
    this.genres = _.uniq(
        _.pluck(
            this.songs,
            'genre'
        )
    ).sort(this.sortFunc);
    this.artists = _.uniq(
        _.pluck(
            this.songs,
            'artist'
        )
    ).sort(this.sortFunc);
    this.albums = _.uniq(
        _.pluck(
            this.songs,
            'album'
        )
    ).sort(this.sortFunc);
}

Main.prototype.sortFunc = function(a, b){
    if(a.toLowerCase() > b.toLowerCase()){
        return 1;
    }
    if(a.toLowerCase() < b.toLowerCase()){
        return -1;
    }
}

Main.prototype.getFileUrl = function(url){
    this.itunesDir.filesystem.root.getFile(url, {create: false}, function(fileEntry) {
        /*
console.log(fileEntry);
        fileEntry.file(function(file) {
            console.log('file', file);
            console.log(window.URL.createObjectURL(file));     
        })
*/
    }, function(e){
        this.errorCount++;
        //console.log('getFileUrl error', e);
        console.log('error', this.errorCount, url);
    }.bind(this));
}



$(document).ready(
    function(){
        window.main = new Main();
    }
);
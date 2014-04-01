window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../node_modules/backbone/node_modules/underscore/underscore.js');


var itunesParser = require('itunes-parser'),
    parseUrl = require('url');

function Main(){
    this.ip = '108.182.90.118';
    this.port = 9800;
    this.genres = [];
    this.artists = [];
    this.albums = [];
    this.songs = [];
    this.errorCount = 0;
    chrome.sockets.tcpServer.create(this.onSocketCreate.bind(this));
    this.getMediaFileSystems();
};

Main.prototype.onSocketCreate = function(createInfo){
    console.log('create', createInfo);
    this.socketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(createInfo.socketId, '0.0.0.0', this.port, null, this.onSocketListen.bind(this));
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
    var data = this.arrayBufferToString(info.data);
    if(data.indexOf("GET ") == 0) {
        var uriEnd =  data.indexOf(" ", 4);
        if(uriEnd < 0) {
            return; 
        }
        var uri = data.substring(4, uriEnd);
        var obj = parseUrl.parse(uri, true);
        //console.log('uri', uri, obj);
        switch(obj.pathname){
            case '/getSong':
                this.getFile(obj.query.file).then(
                    function(file){
                        console.log('send file:', obj.query.file);
                        this.sendFile(info.socketId, file, false);
                    }.bind(this),
                    function(e){
                        console.log('no file', e);
                        this.writeErrorResponse(info.socketId, e.code, false);
                    }.bind(this)
                );
            break;
            case '/getLibrary':
                this.sendJSON(info.socketId, this.songs, false);
            break;
            case '/ping':
                this.sendJSON(info.socketId, {'ping': 'ok'}, false);
            break;
            default:
                this.writeErrorResponse(info.socketId, 404, false);
            break;
        }
    }
    else{
        this.writeErrorResponse(info.socketId, 406, false);
    }
}

Main.prototype.send200 = function(socketId){
    chrome.sockets.tcp.send(socketId, '200', function(sendInfo){
        chrome.sockets.tcp.close(socketId, function(){
            console.log('close:', socketId);
        })
    })
}

Main.prototype.sendError = function(socketId){
    chrome.sockets.tcp.send(socketId, 'error', function(sendInfo){
        chrome.sockets.tcp.close(socketId, function(){
            console.log('close:', socketId);
        })
    })
}

Main.prototype.sendFile = function(socketId, file, keepAlive) {
    var contentType = (file.type === "") ? "text/plain" : file.type;
    var contentLength = file.size;
    var header = this.stringToUint8Array("HTTP/1.0 200 OK\nContent-length: " + file.size + "\nContent-type:" + contentType + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer)
    view.set(header, 0);
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        view.set(new Uint8Array(e.target.result), header.byteLength);
        chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
            console.log("sendInfo", sendInfo);
            if (keepAlive) {
                //readFromSocket(socketId);
            } 
            else {
                //socket.destroy(socketId);
                //socket.accept(socketInfo.socketId, onAccept);
                chrome.sockets.tcp.close(socketId, function(){
                    console.log('close:', socketId);
                });
            }
        });
    }
    fileReader.readAsArrayBuffer(file);
};

Main.prototype.sendJSON = function(socketId, obj, keepAlive) {
    var sendObj = {
        'status': 200,
        'response': obj
    }
    var json = JSON.stringify(sendObj);
    var file = new Blob([json], {type: 'application/json'});
    var header = this.stringToUint8Array("HTTP/1.0 200 OK\nAccess-Control-Allow-Origin:*\nContent-length: " + file.size + "\nContent-type:" + file.type + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer);
    view.set(header, 0);
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        view.set(new Uint8Array(e.target.result), header.byteLength);
        chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
            console.log("sendInfo", sendInfo);
            if (keepAlive) {
                //readFromSocket(socketId);
            } 
            else {
                //socket.destroy(socketId);
                //socket.accept(socketInfo.socketId, onAccept);
                chrome.sockets.tcp.close(socketId, function(){
                    console.log('close:', socketId);
                });
            }
        });
    }
    fileReader.readAsArrayBuffer(file);
};

Main.prototype.writeErrorResponse = function(socketId, errorCode, keepAlive) {
    var file = { size: 0 };
    var contentType = "text/plain"; //(file.type === "") ? "text/plain" : file.type;
    var contentLength = file.size;
    var header = this.stringToUint8Array("HTTP/1.0 " + errorCode + " Not Found\nContent-length: " + file.size + "\nContent-type:" + contentType + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer)
    view.set(header, 0);
    chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
        console.log("sendInfo", sendInfo);
        if (keepAlive) {
            //readFromSocket(socketId);
        } else {
            //socket.destroy(socketId);
            //socket.accept(socketInfo.socketId, onAccept);
            chrome.sockets.tcp.close(socketId, function(){
                console.log('close:', socketId);
            });
        }
    });
};

Main.prototype.onUnPause = function(){
    chrome.sockets.tcpServer.getInfo(this.socketId, function(info){
        //console.log('info', info);
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

Main.prototype.stringToUint8Array = function(string) {
    var buffer = new ArrayBuffer(string.length);
    var view = new Uint8Array(buffer);
    for(var i = 0; i < string.length; i++) {
      view[i] = string.charCodeAt(i);
    }
    return view;
};

Main.prototype.getMediaFileSystems = function(){
    chrome.mediaGalleries.getMediaFileSystems(null, this.onMediaFileSystems.bind(this));
}

Main.prototype.onMediaFileSystems = function(mediaFileSystems){
    mediaFileSystems.forEach(function(item, indx, arr) {
         var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
         if(mData.name === 'iTunes'){
             this.readDir(item);
         }
    }.bind(this));
}

Main.prototype.readDir = function(fs) {
    var dirReader = fs.root.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            results.forEach(function(item, index){
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

/*
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
*/

/*
Main.prototype.readMusicDirs = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            this.readMusicFiles(results[0]);
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}
*/

/*
Main.prototype.readMusicFiles = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            this.getMusicFiles(results[0]);
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}
*/

/*
Main.prototype.getMusicFiles = function(item) {
    var dirReader = item.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
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
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
}
*/

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
    this.songs = itunesParser.parse(
        str,
        {
            'Track ID': 'id',
            'Artist': 'artist',
            'Album': 'album',
            'Genre': 'genre',
            'Name': 'title',
            'Location': 'url'
        }
    );
    this.fixSongs(this.songs).then(
        function(songs){
            this.songs = songs;
            //this.readItunesDir(this.itunesDir);
        }.bind(this),
        function(){
            console.log('fixSongs error');
        }.bind(this)
    );
}

Main.prototype.fixSongs = function(){
    var promise = $.Deferred();
    var songs = [];
    var getFileUrls = [];
    _.each(
        this.songs,
        function(song){
            if(song.artist){
                song.artist = song.artist.replace(/&amp;/g, "&");
                var artist = song.artist;
            }
            if(song.album){
                song.album = song.album.replace(/&amp;/g, "&");
                var album = song.album;
            }
            if(!song.genre){
                song.genre = 'Unknown';
            }
            var location = song.url;
            var lastSlash = location.lastIndexOf('/');
            var fileName = location.slice(lastSlash + 1);
            fileName = fileName.replace(/%20/g," ");
            fileName = fileName.replace(/:/g,"_");
            fileName = fileName.replace(/\//g,"_");
            fileName = fileName.replace(/&amp;/g, "&");
            if(artist){
                artist = artist.replace(/%20/g," ");
                artist = artist.replace(/:/g,"_");
                artist = artist.replace(/\//g,"_");
            }
            if(album){
                album = album.replace(/%20/g," ");
                album = album.replace(/:/g,"_");
                album = album.replace(/\//g,"_");
            }
            song.url = '/iTunes Media/Music/' + artist + '/' + album + '/' + fileName;
            getFileUrls.push(this.getFileUrl(song));
        }.bind(this)
    );
    $.when.apply($, getFileUrls).then(
        function(song){
            _.each(
                arguments,
                function(song){
                    if(song){
                        songs.push(song);
                    }
                }.bind(this)
            );
            promise.resolve(songs);
        }.bind(this),
        function(e){
            promise.resolve(songs);
        }
    );
    return promise;
}

/*
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
*/

/*
Main.prototype.sortFunc = function(a, b){
    if(a.toLowerCase() > b.toLowerCase()){
        return 1;
    }
    if(a.toLowerCase() < b.toLowerCase()){
        return -1;
    }
}
*/

Main.prototype.getFileUrl = function(song){
    var promise = $.Deferred();
    this.itunesDir.filesystem.root.getFile(song.url, {create: false}, function(fileEntry) {
        promise.resolve(song);
        /*
console.log(fileEntry);
        fileEntry.file(function(file) {
            console.log('file', file);
            console.log(window.URL.createObjectURL(file));     
        })
*/
    }, function(e){
        this.errorCount++;
        promise.resolve(null);
    }.bind(this));
    return promise;
}

Main.prototype.getFile = function(url){
    var promise = $.Deferred();
    this.itunesDir.filesystem.root.getFile(url, {create: false}, function(fileEntry) {
        fileEntry.file(function(file) {
            promise.resolve(file);    
        })
    }, function(e){
        promise.reject(
            {
                'code': 404
            }
        );
    }.bind(this));
    return promise;
}




$(document).ready(
    function(){
        window.main = new Main();
    }
);
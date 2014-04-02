(function(){

var itunesParser = require('itunes-parser');

function Library(){
    console.log('new Library');
    this.itunesDir = null;
    this.songs = [];
    this.errorCount = 0;
};

Library.prototype.getItunesDir = function(){
    var promise = $.Deferred();
    if(this.itunesDir !== null){
        console.log('had it');
        promise.resolve(this.itunesDir);
    }
    else{
        chrome.mediaGalleries.getMediaFileSystems(
            null,
            function(mediaFileSystems){
                mediaFileSystems.forEach(
                    function(item, indx, arr) {
                        var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
                        if(mData.name === 'iTunes'){
                            this.readDir(item).then(
                                function(dir){
                                    this.itunesDir = dir;
                                    promise.resolve(dir);
                                },
                                function(e){
                                    promise.reject();
                                }
                            );               
                        }
                    }.bind(this)
                );
            }.bind(this)
        );
    }
    return promise;
}

Library.prototype.parse = function(){
    var songList = [];
    this.getMediaFileSystems().then(
        function(mediaFileSystems){
            var iTunesMFS;
            mediaFileSystems.forEach(
                function(mediaFileSystem){
                    var data = chrome.mediaGalleries.getMediaFileSystemMetadata(mediaFileSystem);
                    if(data.name === 'iTunes'){
                        this.itunesDir = mediaFileSystem;
                        iTunesMFS = this.getXMLFile(mediaFileSystem);
                    }
                }.bind(this)
            );
            return iTunesMFS;
        }.bind(this)
    ).then(
        function(xmlFile){
            return this.readFile(xmlFile);
        }.bind(this)
    ).then(
        function(xmlStr){
            return this.parseXMLFile(xmlStr);
        }.bind(this)
    ).then(
        function(songs){
            return this.fixSongs(songs);
        }.bind(this)
    ).then(
        function(songs){
            songList = songs;
            return this.getFileSystem();
        }.bind(this)
    ).then(
        function(fs){
            return this.getSongsFile(fs, true, false);
        }.bind(this)
    ).then(
        function(fileEntry){
            return this.writeSongsFile(fileEntry, songList);
        }.bind(this)
    ).then(
        function(fileEntry){
            return this.readFile(fileEntry);
        }.bind(this)
    ).then(
        function(songs){
            var json = JSON.parse(songs);
            console.log('songs', json);  
        },
        function(e){
            console.error('Library parse error:', e);
        }
    )
}

Library.prototype.getLibrary = function(){
    return this.getFileSystem().then(
        function(fs){
            return this.getSongsFile(fs, false, true);
        }.bind(this)
    );
}

Library.prototype.getMediaFileSystems = function(){
    var deferred = new $.Deferred();
    chrome.mediaGalleries.getMediaFileSystems(
        null,
        function(mediaFileSystems){
            deferred.resolve(mediaFileSystems);
        }
    );
    return deferred.promise();
}


Library.prototype.getXMLFile = function(fs) {
    var deferred = new $.Deferred();
    var dirReader = fs.root.createReader();
    var readEntries = function() {
        dirReader.readEntries (
            function(results) {
                results.forEach(
                    function(item, index){
                        if(item.name === "iTunes Music Library.xml"){
                            deferred.resolve(item);
                        }
                    }
                )
            }, 
            null
        );
    }
    readEntries();
    return deferred.promise();
}

Library.prototype.readFile = function(fileEntry){
    var deferred = new $.Deferred();
    fileEntry.file(
        function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                deferred.resolve(e.target.result);
            }
            reader.readAsText(file);
        }, 
        null
    );
    return deferred.promise();
}

Library.prototype.parseXMLFile = function(xmlStr){
    return itunesParser.parse(
        xmlStr,
        {
            'Track ID': 'id',
            'Artist': 'artist',
            'Album': 'album',
            'Genre': 'genre',
            'Name': 'title',
            'Location': 'url'
        }
    );
}

Library.prototype.fixSongs = function(list){
    var deferred = new $.Deferred();
    var songs = [];
    var checkFileUrls = [];
    _.each(
        list,
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
            checkFileUrls.push(this.checkFileUrl(song));
        }.bind(this)
    );
    $.when.apply($, checkFileUrls).then(
        function(song){
            _.each(
                arguments,
                function(song){
                    if(song){
                        songs.push(song);
                    }
                }.bind(this)
            );
            deferred.resolve(songs);
        }.bind(this),
        function(e){
            deferred.resolve(songs);
        }
    );
    return deferred.promise();
}

Library.prototype.checkFileUrl = function(song){
    var deferred = new $.Deferred();
    this.itunesDir.root.getFile(
        song.url,
        {
            'create': false
        },
        function(fileEntry) {
            deferred.resolve(song);
        },
        function(e){
            this.errorCount++;
            deferred.resolve(null);
        }.bind(this)
    );
    return deferred.promise();
}

Library.prototype.getFileSystem = function(){
    var deferred = new $.Deferred();
    var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    requestFileSystem(
        window.PERSISTENT,
        20*1024*1024,
        function(fs){
            deferred.resolve(fs);
        },
        function(e){
            deferred.reject(e);
        }
    );
    return deferred.promise();
}

Library.prototype.getSongsFile = function(fs, create, exclusive){
    var deferred = new $.Deferred();
    fs.root.getFile(
        'songs.txt',
        {
            'create': create, 
            'exclusive': exclusive
        }, 
        function(fileEntry) {
            deferred.resolve(fileEntry);
        },
        function(e){
            deferred.reject(e);
        }
    );
    return deferred.promise();
}

Library.prototype.writeSongsFile = function(fileEntry, songList){
    var deferred = new $.Deferred();
    fileEntry.createWriter(
        function(fileWriter){
            fileWriter.onwriteend = function(e) {
                deferred.resolve(fileEntry);
            };
            fileWriter.onerror = function(e) {
                deferred.reject(e);
            };
            var json = JSON.stringify(songList);
            var blob = new Blob([json], {type: 'text/plain'});
            fileWriter.write(blob);
        },
        function(e){
            deferred.reject(e);
        }  
    );
    return deferred.promise();
}

/*
Library.prototype.onMediaFileSystems = function(mediaFileSystems){
    mediaFileSystems.forEach(function(item, indx, arr) {
         var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
         if(mData.name === 'iTunes'){
             this.readDir(item);
         }
    }.bind(this));
}

Library.prototype.readDir = function(fs) {
    console.log('readDir');
    var promise = $.Deferred();
    var dirReader = fs.root.createReader();
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            console.log(results);
            results.forEach(function(item, index){
                if(item.name === "iTunes Music Library.xml"){
                    this.readFile(item);
                }
                if(item.name === "iTunes Media"){
                    this.itunesDir = item;
                    promise.resolve(this.itunesDir);
                }
            }.bind(this))
        }.bind(this), null);
    }.bind(this);
    readEntries(); // Start reading dirs.
    return promise;
}

Library.prototype.readFile = function(fileEntry){
    fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
            this.parseXML(e.target.result);
        }.bind(this);
        reader.readAsText(file);
    }.bind(this), null);
}

Library.prototype.parseXML = function(str){
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
            console.log('Library parsed:', this.songs.length);
        }.bind(this),
        function(){
            console.log('fixSongs error');
        }.bind(this)
    );
}



Library.prototype.checkFileUrl = function(song){
    var promise = $.Deferred();
    this.itunesDir.root.getFile(
        song.url,
        {
            'create': false
        },
        function(fileEntry) {
            promise.resolve(song);
        },
        function(e){
            this.errorCount++;
            promise.resolve(null);
        }.bind(this)
    );
    return promise;
}
*/

Library.prototype.getFile = function(url){
    var promise = $.Deferred();
    this.getItunesDir().then(
        function(dir){
            dir.filesystem.root.getFile(
                url,
                {
                    'create': false
                },
                function(fileEntry) {
                    fileEntry.file(
                        function(file) {
                            promise.resolve(file);    
                        }
                    );
                }, 
                function(e){
                    promise.reject(
                        {
                            'code': 404
                        }
                    );
                }
            );
        },
        function(e){
            promise.reject();
        }
    );
    return promise;
}

module.exports = Library;

}()); // end wrapper
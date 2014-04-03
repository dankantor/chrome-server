(function(){

var itunesParser = require('itunes-parser');

function Library(){
    console.log('Library');
    this.itunesFS = null;
};


// parse the itunes xml file 
// into an object
// save object as json in filesystem
Library.prototype.parse = function(){
    var songList = [];
    this.getMediaFileSystems().then(
        function(mediaFileSystems){
            return this.getITunesMediaFileSystem(mediaFileSystems);
        }.bind(this)
    ).then(
        function(iTunesFileSystem){
            this.itunesFS = iTunesFileSystem;
            return this.getXMLFile(this.itunesFS);
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
        },
        function(e){
            console.error('Library parse error:', e);
        }
    )
}

// get the songs json 
// object from filesystem
Library.prototype.getSongs = function(){
    return this.getFileSystem().then(
        function(fs){
            return this.getSongsFile(fs, false, true);
        }.bind(this)
    );
}

// get the itunes media file system
Library.prototype.getItunesFS = function(){
    var deferred = new $.Deferred();
    if(this.itunesFS !== null){
        deferred.resolve(this.itunesFS);
    }
    else{
        this.getMediaFileSystems().then(
            function(mediaFileSystems){
                return this.getITunesMediaFileSystem(mediaFileSystems);
            }.bind(this)
        ).then(
            function(iTunesFileSystem){
                this.itunesFS = iTunesFileSystem;
                deferred.resolve(this.itunesFS);
            }.bind(this)
        );
    }
    return deferred.promise();
}

// get all media file systems
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

// loop through all media file systems
// return itunes media file system
Library.prototype.getITunesMediaFileSystem = function(mediaFileSystems){
    var deferred = new $.Deferred();
    mediaFileSystems.forEach(
        function(mediaFileSystem) {
            var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(mediaFileSystem);
            if(mData.name === 'iTunes'){
                deferred.resolve(mediaFileSystem);               
            }
        }
    );
    return deferred.promise();
}

// get iTunes Music Library.xml file
// from the iTunes media file system
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

// read a file and return text
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

// parse iTunes Music Library.xml
// return songs object 
Library.prototype.parseXMLFile = function(xmlStr){
    return itunesParser.parse(
        xmlStr,
        {
            'Track ID': 'id',
            'Artist': 'artist',
            'Album': 'album',
            'Genre': 'genre',
            'Name': 'title',
            'Location': 'url',
            'Kind': 'kind'
        }
    );
}

// loop through songs 
// fix metadata
// remove bad songs (videos, iCloud, etc)
Library.prototype.fixSongs = function(list){
    var deferred = new $.Deferred();
    var songs = [];
    var checkFileUrls = [];
    _.each(
        list,
        function(song){
            if(song.kind.indexOf('audio') !== -1){
                delete song.kind;
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
                if(song.url){
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
                }
            }
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

// make sure the url we get from
// the iTunes xml file matches
// a file we can get from iTunes file system
Library.prototype.checkFileUrl = function(song){
    var deferred = new $.Deferred();
    this.itunesFS.root.getFile(
        song.url,
        {
            'create': false
        },
        function(fileEntry) {
            deferred.resolve(song);
        },
        function(e){
            deferred.resolve(null);
        }.bind(this)
    );
    return deferred.promise();
}

// get sandboxed file system
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

// get access to songs.txt
// in sandboxed file system
// reading or writing
Library.prototype.getSongsFile = function(fs, create, exclusive){
    var deferred = new $.Deferred();
    fs.root.getFile(
        'songs.json',
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

// write songs object
// as json to songs.txt file
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
            var blob = new Blob([json], {type: 'text/json'});
            fileWriter.write(blob);
        },
        function(e){
            deferred.reject(e);
        }  
    );
    return deferred.promise();
}

// get a song file
// from itunes file system
Library.prototype.getFile = function(url){
    var promise = $.Deferred();
    this.getItunesFS().then(
        function(dir){
            dir.root.getFile(
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
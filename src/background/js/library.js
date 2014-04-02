(function(){

var itunesParser = require('itunes-parser');

function Library(){
    console.log('library');
    this.songs = [];
    this.errorCount = 0;
    this.getMediaFileSystems();
};

Library.prototype.getMediaFileSystems = function(){
    chrome.mediaGalleries.getMediaFileSystems(null, this.onMediaFileSystems.bind(this));
}

Library.prototype.onMediaFileSystems = function(mediaFileSystems){
    mediaFileSystems.forEach(function(item, indx, arr) {
         var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
         if(mData.name === 'iTunes'){
             this.readDir(item);
         }
    }.bind(this));
}

Library.prototype.readDir = function(fs) {
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

Library.prototype.fixSongs = function(){
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

Library.prototype.getFileUrl = function(song){
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

Library.prototype.getFile = function(url){
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

module.exports = Library;

}()); // end wrapper
window.$ = require('jquery');
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');


var Server = require('./server.js'),
    Library = require('./library.js');

function Main(){
    console.log('Main');
    this.library = null;
    this.server = null
};

Main.prototype.startServer = function(){
    if(this.server === null){
        this.server = new Server();
    }
    this.server.start();
}

Main.prototype.parseLibrary = function(){
    if(this.library === null){
        this.library = new Library();
    }
    this.library.parse();
}


var main = new Main();
main.startServer()


chrome.runtime.onInstalled.addListener(function(){
    main.parseLibrary();
});


// on restart start server

window.$ = require('jquery');
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');


var Server = require('./server.js'),
    Library = require('./library.js');

function Main(){
    console.log('Main');
    this.library = new Library();
    this.library.parse();
    this.server = new Server();
    this.server.start();
};


chrome.runtime.onInstalled.addListener(function(){
    window.main = new Main();
});

//chrome.runtime.onStartup.addListener(this.onStartup.bind(this));
//chrome.app.runtime.onLaunched.addListener(this.onStartup.bind(this));
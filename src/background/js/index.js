window.$ = require('jquery');
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');


var Server = require('./server.js'),
    Library = require('./library.js');

function Main(){
    console.log('background main');
    this.library = new Library();
    this.library.parse();
    this.server = new Server(
        {
            'library': this.library
        }
    );
};


chrome.runtime.onInstalled.addListener(function(){
    window.main = new Main();
});

/*
chrome.app.runtime.onLaunched.addListener(
    function(){
        console.log('onLaunched');
    }
);
*/
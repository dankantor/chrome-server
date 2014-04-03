(function(){

window.$ = require('jquery');
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');


var Server = require('./../../common/js/server.js'),
    Library = require('./../../common/js/library.js');

function Main(){
    this.library = null;
    this.server = null;
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
main.startServer();


chrome.runtime.onInstalled.addListener(function(){
    var main = new Main();
    main.startServer();
    main.parseLibrary();
});

chrome.runtime.onStartup.addListener(function(){
    var main = new Main();
    main.startServer();
    main.parseLibrary();
});

chrome.app.runtime.onRestarted.addListener(function(){
    var main = new Main();
    main.startServer();
    main.parseLibrary();
});

chrome.app.runtime.onLaunched.addListener(
    function(){
        chrome.app.window.create(
            'options/options.html', 
            {
                'id': 'server_options',
                'bounds':
                    {
                        'width': 350,
                        'height': 130
                    },
                'minWidth': 350,
                'minHeight': 130
            }
        );
    }
);

}()); // end wrapper


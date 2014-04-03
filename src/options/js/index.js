(function(){

window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');

var View = require('./view.js'),
    Server = require('./../../common/js/server.js');

function Options(){
    console.log('options');
    var server = new Server();
    server.getPort().then(
        function(port){
            var view = new View(
                {
                    'el': '#container',
                    'server': server,
                    'port': port
                }
            );    
        }
    );
};


$(document).ready(
    function(){
        var options = new Options();
    }
);


}()); // end wrapper



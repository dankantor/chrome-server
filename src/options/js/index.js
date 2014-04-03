(function(){

window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../../node_modules/backbone/node_modules/underscore/underscore.js');

var View = require('./view.js'),
    Server = require('./../../common/js/server.js'),
    Library = require('./../../common/js/library.js');

function Options(){
    console.log('options');
    var server = new Server();
    var library = new Library();
    var thens = [server.getPort(), library.getLastScan()];
    $.when.apply($, thens).then(
        function(port, date){
            var view = new View(
                {
                    'el': '#container',
                    'server': server,
                    'port': port,
                    'library': library,
                    'lastScan': date
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



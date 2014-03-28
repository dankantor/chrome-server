window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../node_modules/backbone/node_modules/underscore/underscore.js');

function Main(){
    
};


$(document).ready(
    function(){
        window.main = new Main();
    }
);
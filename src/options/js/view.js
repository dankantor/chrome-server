var template = require('./../templates/options.hbs'),
    Library = require('./../../common/js/library.js');

module.exports = Backbone.View.extend({
    initialize: function(opts){
        this.server = opts.server;
        this.render(opts.port);
        this.cacheElements();
        this.addListeners();
    },
    render: function(port){
        var html = template(
            {
                'port': port
            }
        );
        this.$el.append(html);
    },
    cacheElements: function(){
       this.portButton = $('#port-button');
       this.portInput = $('#port-input');
    },
    addListeners: function(){
        this.portButton.on(
            'click',
            this.onPortButtonClick.bind(this)
        )
    },
    onPortButtonClick: function(e){
        var port = this.portInput.val();
        if(port !== ''){
            this.server.changePort(port).then(
                function(newPort){
                    this.portInput.val(newPort);
                }.bind(this)
            );
        }
    }
});
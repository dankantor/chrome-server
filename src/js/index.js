window.$ = require('jquery');
window.Backbone = require('backbone');
window.Backbone.$ = window.$;
window._ = require('./../../node_modules/backbone/node_modules/underscore/underscore.js');

function Main(){
    console.log(chrome);
    chrome.sockets.tcpServer.create(this.onSocketCreate.bind(this));
};

Main.prototype.onSocketCreate = function(createInfo){
    console.log('create', createInfo);
    this.socketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(createInfo.socketId, '0.0.0.0', 9800, null, this.onSocketListen.bind(this));
}

Main.prototype.onSocketListen = function(result){
    console.log('onSocketListen', result);
    chrome.sockets.tcpServer.onAccept.addListener(this.onSocketAccept.bind(this));
    chrome.sockets.tcpServer.onAcceptError.addListener(this.onSocketAcceptError.bind(this));
    chrome.sockets.tcp.onReceive.addListener(this.onSocketReceive.bind(this));
}

Main.prototype.onSocketAccept = function(info){
    console.log('onSocketAccept', info); 
    chrome.sockets.tcp.setPaused(info.clientSocketId, false, this.onUnPause.bind(this)) 
}

Main.prototype.onSocketAcceptError = function(info){
    console.log('onSocketAcceptError', info);  
}

Main.prototype.onSocketReceive = function(info){
    console.log('onSocketReceive', info);  
    var str = this.arrayBufferToString(info.data);
    console.log('got str:', str);
    chrome.sockets.tcp.send(info.socketId, info.data, function(sendInfo){
        console.log('sendInfo', sendInfo);
        chrome.sockets.tcp.close(info.socketId, function(){
            console.log('close:', info.socketId);
        })
    })
}


Main.prototype.onUnPause = function(){
    console.log('onUnPause');
    chrome.sockets.tcpServer.getInfo(this.socketId, function(info){
        console.log('info', info);
    })
}

Main.prototype.arrayBufferToString = function(buffer) {
    var str = '';
    var uArrayVal = new Uint8Array(buffer);
    for(var s = 0; s < uArrayVal.length; s++) {
        str += String.fromCharCode(uArrayVal[s]);
    }
    return str;
};


$(document).ready(
    function(){
        window.main = new Main();
    }
);
(function(){

var parseUrl = require('url'),
    Library = require('./library.js');

function Server(opts){
    this.port = 9800;
    this.library = null;
};

Server.prototype.start = function(){
    console.log('Server start');
    chrome.sockets.tcpServer.getSockets(this.onGetSockets.bind(this));
}

Server.prototype.onGetSockets = function(socketInfos){
    console.log('socketInfos', socketInfos);
    if(socketInfos.length <= 0){
        this.createSocket();
    }
    else{
        this.listen(socketInfos[0].socketId, 'exists');
    }
}

Server.prototype.createSocket = function(){
    chrome.sockets.tcpServer.create(
        {
            'persistent': true,
            'name': 'ex'
        },
        this.onSocketCreate.bind(this)
    );
}

Server.prototype.onSocketCreate = function(createInfo){
    this.listen(createInfo.socketId, 'create');
}

Server.prototype.listen = function(socketId, type){
    chrome.sockets.tcpServer.listen(
        socketId,
        '0.0.0.0',
        this.port,
        null,
        this.onSocketListen.bind(this, type)
    );
}

Server.prototype.onSocketListen = function(type, result){
    chrome.storage.local.set(
        {
            'listen': 
                {
                    'type': type,
                    'result': result
                }
        }
    );
    chrome.sockets.tcpServer.onAccept.addListener(this.onSocketAccept.bind(this));
    chrome.sockets.tcpServer.onAcceptError.addListener(this.onSocketAcceptError.bind(this));
    chrome.sockets.tcp.onReceive.addListener(this.onSocketReceive.bind(this));
}

Server.prototype.onSocketAccept = function(info){
    //console.log('onSocketAccept', info); 
    chrome.sockets.tcp.setPaused(info.clientSocketId, false, this.onUnPause.bind(this)); 
}

Server.prototype.onSocketAcceptError = function(info){
    console.log('onSocketAcceptError', info);  
}

Server.prototype.onSocketReceive = function(info){
    var data = this.arrayBufferToString(info.data);
    if(data.indexOf("GET ") == 0) {
        var uriEnd =  data.indexOf(" ", 4);
        if(uriEnd < 0) {
            return; 
        }
        var uri = data.substring(4, uriEnd);
        var obj = parseUrl.parse(uri, true);
        switch(obj.pathname){
            case '/getSong':
                var library = this.getLibrary();
                library.getFile(obj.query.file).then(
                    function(file){
                        this.sendFile(info.socketId, file, false);
                    }.bind(this),
                    function(e){
                        this.writeErrorResponse(info.socketId, e.code, false);
                    }.bind(this)
                );
            break;
            case '/ping':
                this.sendJSON(info.socketId, {'ping': 'ok'}, false);
            break;
            case '/favicon.ico':
                this.writeErrorResponse(info.socketId, 404, false);
            break;
            case '/getLibrary':
                var library = this.getLibrary();
                library.getSongs().then(
                    function(fileEntry){
                        fileEntry.file(
                            function(file) {
                                this.sendFile(info.socketId, file, false);    
                            }.bind(this)
                        );
                    }.bind(this),
                    function(e){
                        this.writeErrorResponse(info.socketId, e.code, false);
                    }.bind(this)
                );
            break;
            default:
                this.writeErrorResponse(info.socketId, 404, false);
            break;
        }
    }
    else{
        this.writeErrorResponse(info.socketId, 406, false);
    }
}

Server.prototype.getLibrary = function(){
    if(this.library !== null){
        return this.library;
    }
    else{
        this.library = new Library();
        return this.library;
    }
}

Server.prototype.send200 = function(socketId){
    chrome.sockets.tcp.send(socketId, '200', function(sendInfo){
        chrome.sockets.tcp.close(socketId, function(){
            console.log('close:', socketId);
        })
    })
}

Server.prototype.sendError = function(socketId){
    chrome.sockets.tcp.send(socketId, 'error', function(sendInfo){
        chrome.sockets.tcp.close(socketId, function(){
            console.log('close:', socketId);
        })
    })
}

Server.prototype.sendFile = function(socketId, file, keepAlive) {
    var contentType = (file.type === "") ? "text/plain" : file.type;
    var contentLength = file.size;
    var header = this.stringToUint8Array("HTTP/1.0 200 OK\nAccess-Control-Allow-Origin:*\nContent-length: " + file.size + "\nContent-type:" + contentType + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer)
    view.set(header, 0);
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        view.set(new Uint8Array(e.target.result), header.byteLength);
        chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
            console.log("sendInfo", sendInfo);
            if (keepAlive) {
                //readFromSocket(socketId);
            } 
            else {
                //socket.destroy(socketId);
                //socket.accept(socketInfo.socketId, onAccept);
                chrome.sockets.tcp.close(socketId, function(){
                    console.log('close:', socketId);
                });
            }
        });
    }
    fileReader.readAsArrayBuffer(file);
};

Server.prototype.sendJSON = function(socketId, obj, keepAlive) {
    var sendObj = {
        'status': 200,
        'response': obj
    }
    var json = JSON.stringify(sendObj);
    var file = new Blob([json], {type: 'application/json'});
    var header = this.stringToUint8Array("HTTP/1.0 200 OK\nAccess-Control-Allow-Origin:*\nContent-length: " + file.size + "\nContent-type:" + file.type + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer);
    view.set(header, 0);
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        view.set(new Uint8Array(e.target.result), header.byteLength);
        chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
            console.log("sendInfo", sendInfo);
            if (keepAlive) {
                //readFromSocket(socketId);
            } 
            else {
                //socket.destroy(socketId);
                //socket.accept(socketInfo.socketId, onAccept);
                chrome.sockets.tcp.close(socketId, function(){
                    console.log('close:', socketId);
                });
            }
        });
    }
    fileReader.readAsArrayBuffer(file);
};

Server.prototype.writeErrorResponse = function(socketId, errorCode, keepAlive) {
    var file = { size: 0 };
    var contentType = "text/plain"; //(file.type === "") ? "text/plain" : file.type;
    var contentLength = file.size;
    var header = this.stringToUint8Array("HTTP/1.0 " + errorCode + " Not Found\nAccess-Control-Allow-Origin:*\nContent-length: " + file.size + "\nContent-type:" + contentType + ( keepAlive ? "\nConnection: keep-alive" : "") + "\n\n");
    var outputBuffer = new ArrayBuffer(header.byteLength + file.size);
    var view = new Uint8Array(outputBuffer)
    view.set(header, 0);
    chrome.sockets.tcp.send(socketId, outputBuffer, function(sendInfo){
        console.log("sendInfo", sendInfo);
        if (keepAlive) {
            //readFromSocket(socketId);
        } else {
            //socket.destroy(socketId);
            //socket.accept(socketInfo.socketId, onAccept);
            chrome.sockets.tcp.close(socketId, function(){
                console.log('close:', socketId);
            });
        }
    });
};

Server.prototype.onUnPause = function(){
    
}

Server.prototype.arrayBufferToString = function(buffer) {
    var str = '';
    var uArrayVal = new Uint8Array(buffer);
    for(var s = 0; s < uArrayVal.length; s++) {
        str += String.fromCharCode(uArrayVal[s]);
    }
    return str;
};

Server.prototype.stringToUint8Array = function(string) {
    var buffer = new ArrayBuffer(string.length);
    var view = new Uint8Array(buffer);
    for(var i = 0; i < string.length; i++) {
      view[i] = string.charCodeAt(i);
    }
    return view;
};

module.exports = Server;

}()); // end wrapper
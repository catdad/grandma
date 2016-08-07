/* eslint-disable no-console */

var net = require('net');
var path = require('path');
var EventEmitter = require('events');
var byline = require('byline');

var pipeRoot = /^win/.test(process.platform) ?
    '\\\\?\\pipe\\grandma' :
    '/tmp/grandma';

function writableData(data) {
    if (Buffer.isBuffer(data)) {
        return data;
    } else if (typeof data === 'string') {
        return new Buffer(data);
    } else {
        return writableData(JSON.stringify(data) + '\n');
    }
}

function tryJson(val) {
    try {
        return JSON.parse(val);
    } catch(e) {
        // Avoid eslint error by returning anyway. We
        // expect this to be undefined if the parsing
        // fails.
        return;
    }
}

module.exports = function(socketName, onCreated) {
    
    var pipe = path.join(pipeRoot, socketName);
    
    var clients = {};
    
    var events = new EventEmitter();
    events.send = function sendMessage(name, msg) {
        if (!clients[name]) {
            console.log('CANNOT SENT TO', name);
            return;
        }
        
        clients[name].write(writableData(msg));
    };
    events.connect = function(name, onConnected) {
        var canWrite = false;
        
        var clientPipe = path.join(pipeRoot, name);
        
        var client = net.connect(clientPipe, function() {
            canWrite = true;
            console.log('client %s is connected', name, canWrite);
            onConnected();
        });
        
        client.on('error', function(err) {
            console.log('client %s error', name, err);
        });
        
        clients[name] = client;
    };
    
    var server = net.createServer(function(socket) {
        
        console.log('connection received on', socketName);
        
        // Rapid messages often get grouped together. Since we
        // write a new line character after every message, we
        // can split them up by line to get one message
        // at a time.
        byline(socket).on('data', function(chunk) {
            
            var msg = tryJson(chunk.toString());
            
            if (msg) {
                events.emit('message', msg);
            }
        });
        
    }).listen(pipe, function() {
        console.log('pipe is listening', pipe);
        onCreated(undefined, events);
    });
    
    events.die = function(onDead) {
        events.removeAllListeners();
        
        // destroy server
        server.close(onDead);
        
        // TODO close any client connections
    };
    
    return events;
};

module.exports.masterName = function() {
    return 'master.sock';
};

module.exports.slaveName = function(val) {
    return 'worker' + val + '.sock';
};

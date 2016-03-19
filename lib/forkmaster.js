/* jshint node: true, expr: true */

var path = require('path');
var child = require('child_process');
var _ = require('lodash');

var forkFile = path.resolve(__dirname, 'fork.js');

function start (opts, callback) {
    var threads = opts.threads;
    var forks = [];
    var ready = 0;
    
    var interval;
    var running = 0;
    var complete = false;
    
    function onMessage(id) {
        return function onWorkerMessage(msg) {
            switch(msg.type) {
                case 'error':
                    console.error('worker', id, 'error');
                    console.error(msg.error.message, '\n', msg.stack);
                    break;
                case 'report':
                    console.log(msg);
                    break;
                case 'tick':
                    running -= 1;
                    
                    if (complete && running === 0) {
                        onDone();
                    }
                    
                    break;
                case 'ready':
                    ready += 1;
                    
                    if (ready === forks.length) {
                        startTests();
                    }
                    
                    break;
                default:
                    console.error('unknown message', id, msg);
            }
        };
    }
    
    function onDone() {
        console.log('done is called');
        
        forks.forEach(function(el) {
            el.kill();
        });
        
        callback();
    }
    
    // create as many threads as necessary
    while (threads--) {
        var id = forks.length;
        var worker = child.fork(forkFile, ['--worker=' + id]);
        worker.on('message', onMessage(id));
        
        forks.push(worker);
    }
    
    forks.forEach(function(worker) {
        worker.send({
            command: 'init',
            filepath: opts.filepath
        });
    });
    
    function startTests() {
        interval = setInterval(function() {
            running += 1;
            
            var worker = forks.shift();
            worker.send({
                command: 'run'
            });
            forks.push(worker);
        }, 1);

        setTimeout(function() {
            interval && clearInterval(interval);
            complete = true;

            if (running === 0) {
                onDone();
            } else {
                console.log('time is out, %s tests still running', running);
            }
        }, opts.duration || 10);   
    }
}

module.exports = function forkmaster(options, callback) {
    start(options, callback);
};


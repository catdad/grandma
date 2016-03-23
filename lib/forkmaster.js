/* jshint node: true, expr: true */

var fs = require('fs');
var path = require('path');
var child = require('child_process');
var _ = require('lodash');

var forkFile = path.resolve(__dirname, 'fork.js');

function start(opts, callback) {
    // TODO clean up all the crap under here
    var threads = opts.threads;
    var forks = [];
    var ready = 0;
    
    var interval;
    var running = 0;
    var complete = false;
    var expectedCount = Math.floor(opts.rate * (opts.duration / 1000));
    
    var output = opts.output;
    
    function onMessage(id) {
        return function onWorkerMessage(msg) {
            switch(msg.type) {
                case 'error':
                    console.error('worker', id, 'error');
                    console.error(msg.error.message, '\n', msg.stack);
                    break;
                case 'report':
                    output.write(JSON.stringify(msg) + '\n');
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
        forks.forEach(function(el) {
            el.kill();
        });
        
        if (output !== process.stdout) {
            // TODO can I trust the wait event? What is the chance
            // it already happened?
            output.once('drain', function() {
                output.close();
                callback();
            });
        } else {
            callback();
        }
    }
    
    // create as many threads as necessary
    while (threads--) {
        var id = forks.length;
        var worker = child.fork(forkFile, ['--worker=' + id]);
        worker.on('message', onMessage(id));
        
        forks.push(worker);
    }
    
    // initialie each thread
    forks.forEach(function(worker) {
        worker.send({
            command: 'init',
            filepath: opts.filepath
        });
    });
    
    // threads can take up to 300ms to start at times,
    // so we will wait until they are all initialized
    // in order to start running the test
    function startTests() {
        var intTime = 1000 / (opts.rate || 1);
        
        interval = setInterval(function() {
            running += 1;
            
            var worker = forks.shift();
            worker.send({
                command: 'run'
            });
            forks.push(worker);
            
            expectedCount--;
            
            if (expectedCount === 0) {
                markForDone();
            }
        }, intTime);

        function markForDone() {
            if (interval !== undefined) {
                clearInterval(interval);
                interval = undefined;
            }
            
            complete = true;

            if (running === 0) {
                onDone();
            }
        }
    }
}

module.exports = function forkmaster(options, callback) {
    start(options, callback);
};


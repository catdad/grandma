/* jshint node: true, expr: true */

var fs = require('fs');
var path = require('path');
var child = require('child_process');
var _ = require('lodash');
var Fraction = require('fractional').Fraction;
var through = require('through2');

var enums = require('./enums');
var forkFile = path.resolve(__dirname, 'fork.js');

function currentThread(length) {
    var curr = length - 1;
    
    return function() {
        if (curr === length - 1) {
            curr = 0;
        } else {
            curr += 1;
        }
        
        return curr;
    };
}

function start(opts, callback) {
    // TODO clean up all the crap under here
    var threads = opts.threads;
    var forks = [];
    var ready = 0;
    
    var interval;
    var running = 0;
    var complete = false;
    
    // expect this many test runs total
    var expectedCount = Math.floor(opts.rate * (opts.duration / 1000));
    
    var f = new Fraction(opts.rate, 1000);
    // every x milliseconds
    var intTime = f.denominator;
    // start y amount of tasks
    var concurrent = f.numerator;
    
    console.log(
        'start %d test every %dms for a total of %d',
        concurrent,
        intTime,
        expectedCount
    );

    // Just because we can, we will let through buffer the output stream,
    // so that we can just write to output whenever, and through will
    // back off the disk when it needs to.
    var realoutput = opts.output;
    var output = through();
    output.pipe(realoutput);
    
    var absoluteStart;
    
    function writeReport(report) {
        if (absoluteStart === undefined) {
            absoluteStart = report.start;
        }
        
        // adjust the start and end times based on the first start
        report.start = (report.start - absoluteStart);
        report.end = (report.end - absoluteStart);
        
        output.write(JSON.stringify(report) + '\n');
    }
    
    function onMessage(id) {
        
        function onTick(msg) {
            running -= 1;

            if (complete && running === 0) {
                onDone();
            }
        }
        
        function onReady(msg) {
            ready += 1;

            if (ready === forks.length) {
                startTests();
            }
        }
        
        function onReport(msg) {
            writeReport(msg);
        }
        
        function onError(msg) {
            console.error('worker', id, 'error');
            console.error(msg.error.message, '\n', msg.stack);
        }
        
        function onUnknown(msg) {
            console.error('unknown message', msg);
        }
        
        return function onWorkerMessage(msg) {
            
            if (msg === enums.message.ready) {
                onReady(msg);
            } else if (msg === enums.message.tick) {
                onTick(msg);
            } else if (msg.type && msg.type === 'report') {
                onReport(msg);
                onTick();
            } else if (msg.type && msg.type === 'error') {
                onError(msg);
            } else {
                onUnknown(msg);
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
        
        // TODO
//        worker.on('error', console.log.bind(console, 'error'));
//        worker.on('disconnect', console.log.bind(console, 'disconnect'));
//        worker.on('close', console.log.bind(console, 'close'));
//        worker.on('exit', console.log.bind(console, 'exit'));
        
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
        var i = 0;
        
        interval = setInterval(function() {
            i++;
            var count = concurrent;
            var thread = currentThread(forks.length);
            
            var start = Date.now();
            var c = 0;
            
            while(count--) {
                running += 1;
            
                c++;
                
                var worker = forks[thread()];
                worker.send({
                    command: 'run'
                });

                expectedCount--;

                if (expectedCount === 0) {
                    markForDone();
                    count = 0;
                }
            }
            
//            console.log('ended in', (Date.now() - start), c, i, expectedCount);
        }, intTime);

        function markForDone() {
            
            console.log('done?');
            
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

/* jshint node: true, expr: true */

var fs = require('fs');
var path = require('path');
var child = require('child_process');
var zlib = require('zlib');

var _ = require('lodash');
var async = require('async');
var Fraction = require('fractional').Fraction;
var through = require('through2');

var enums = require('./enums.js');
var forkFile = path.resolve(__dirname, 'fork.js');

var Logger = require('./logger.js');
var logger;

function debug() {
    logger && logger.log && logger.log.apply(logger, arguments);
}

function debugError() {
    logger && logger.error && logger.error.apply(logger, arguments);
}

function isStdio(stream) {
    return stream === process.stdin ||
           stream === process.stdout ||
           stream === process.stderr;
}

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

function ensureAsync(callback) {
    return function asyncCallback() {
        var args = arguments;
        var that = this;
        
        async.setImmediate(function() {
            callback.apply(that, args);
        });
    };
}

function ignoreParams(callback) {
    return function ignoreParamsCallback() {
        callback.call(this);
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
    
    debug(
        'start %d test every %dms for a total of %d',
        concurrent,
        intTime,
        expectedCount
    );

    // Just because we can, we will let through buffer the output stream,
    // so that we can just write to output whenever, and through will
    // back off the disk when it needs to.
    var output = (function(outStream) {
        var bufferOut = through();
        
        if (opts.zip === true) {
            bufferOut.pipe(zlib.createGzip()).pipe(outStream);
        } else {
            bufferOut.pipe(outStream);
        }
        
        bufferOut._fullEnd = false;
        
        // the first one of these will end
        outStream.on('end', onFullEnd);
        outStream.on('finish', onFullEnd);
        outStream.on('close', onFullEnd);
        
        if (isStdio(outStream)) {
            bufferOut.on('end', onFullEnd);
        }
        
        return bufferOut;
        
        function onFullEnd() {
            if (!bufferOut._fullEnd) {
                bufferOut._fullEnd = true;
                bufferOut.emit('fullEnd');
            }
        }
    })(opts.output);
    
    // Require the test so we can run beforeAll and afterAll commands
    var tests = require(opts.filepath);
    
    function writeToStream(data) {
        if (Buffer.isBuffer(data)) {
            output.write(data);
        } else if (typeof data === 'string') {
            output.write(new Buffer(data));
        } else {
            writeToStream(JSON.stringify(data));
        }
    }
    
    function writeHeader() {
        writeToStream(JSON.stringify({
            type: 'header',
            epoch: Date.now(),
            duration: opts.duration,
            rate: opts.rate || null,
            concurrent: opts.concurrent || null,
            targetCount: expectedCount
        }) + '\n');
    }
    
    function writeReport(report) {
        writeToStream(JSON.stringify(report) + '\n');
    }
    
    var onDone = (function() {
        var called = false;
        
        return function onDoneOnce() {
            if (called) {
                return;
            }
            
            called = true;
            
            forks.forEach(function(el) {
                el.kill();
            });

            if (output && !output._fullEnd) {
                output.on('fullEnd', function() {
                    callback();
                });
            } else {
                callback();
            }
            
            output.end();
        };
    })();
    
    function onThreadReady(msg) {
        ready += 1;

        if (ready === forks.length) {
            startTests();
        }
    }

    function onReport(msg) {
        writeReport(msg);
    }
    
    function onMessage(id) {
        
        function onTick(msg) {
            running -= 1;
            
            if (complete && running === 0) {
                onDone();
            }
        }
        
        function onError(msg) {
            debugError('worker', id, 'error');
            debugError(msg.error.message, '\n', msg.stack);
        }
        
        function onUnknown(msg) {
            debugError('unknown message', msg);
        }
        
        return function onWorkerMessage(msg) {
            
            if (msg === enums.message.ready) {
                onThreadReady(msg);
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
    
    // write the header
    writeHeader();
    
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
    
    function onBeforeAll(next) {
        next = ensureAsync(next);
        var context = {};
        
        if (tests && _.isFunction(tests.beforeAll)) {
            tests.beforeAll.call(context, function beforeAllDone() {
                var safeContext = _.reduce(context, function(seed, val, idx) {
                    if (_.isString(val) || _.isNumber(val)) {
                        seed[idx] = val;
                    }
                    
                    return seed;
                }, {});
                
                return next(undefined, safeContext);
            });
        } else {
            return next(undefined, context);
        }
    }
    
    function runAtRate(context, done) {
        var exCount = expectedCount;
        
        function markForDone() {

            if (interval !== undefined) {
                clearInterval(interval);
                interval = undefined;
            }

            done(undefined, context);
        }

        interval = setInterval(function() {
            var count = concurrent;
            var thread = currentThread(forks.length);
            
            var start = Date.now();
            
            while(count--) {
                running += 1;
                
                var worker = forks[thread()];
                worker.send({
                    command: 'run',
                    context: context
                });

                exCount--;

                if (exCount === 0) {
                    markForDone();
                    count = 0;
                }
            }
        }, intTime);
    }

    function runConcurrently(context, done) {
        var isRunning = true;
        var concurrent = opts.concurrent;
        
        function onMessage(msg) {
            if (isRunning && msg.type && msg.type === 'report') {
                startNew();
            }
        }
        
        forks.forEach(function(worker) {
            worker.on('message', onMessage);
        });
        
        function startNew() {
            running += 1;
            
            var thread = currentThread(forks.length);
            var worker = forks[thread()];
            
            worker.send({
                command: 'run',
                context: context
            });
        }
        
        while(concurrent--) {
            startNew();
        }
        
        setTimeout(function() {
            isRunning = false;
            done(undefined, context);
        }, opts.duration);
    }
    
    function runTests(context, next) {
        if (opts.rate) {
            runAtRate(context, next);
        } else if (opts.concurrent) {
            runConcurrently(context, next);
        } else {
            process.nextTick(next);
        }
    }
    
    function onAfterAll(context, next) {
        next = ensureAsync(next);
        
        if (tests && _.isFunction(tests.afterAll)) {
            tests.afterAll.call(context, ignoreParams(next));
        } else {
            next();
        }
    }
    
    // threads can take up to 300ms to start at times,
    // so we will wait until they are all initialized
    // in order to start running the test
    function startTests() {
        async.waterfall([
            onBeforeAll,
            runTests,
            onAfterAll
        ], function() {
            
            complete = true;
            
            if (running === 0) {
                onDone();
            }
        });
    }
}

module.exports = function forkmaster(options, callback) {
    // init the logger
    logger = Logger(options);
    start(options, callback);
};

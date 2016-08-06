var path = require('path');
var child = require('child_process');
var EventEmitter = require('events');

var _ = require('lodash');
var async = require('async');

var enums = require('./enums.js');
var utils = require('./run-utils.js');
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
        callback();
    };
}

function start(opts, callback) {
    var threads = opts.threads;
    var forks = [];
    var ready = 0;

    var running = 0;
    var complete = false;
    
    var repeater = new EventEmitter();
    
    var objectMode = opts._objectMode;
    
    var util = utils(_.merge({}, opts, {
        objectMode: objectMode
    }));
    
    // get the wrapped stream from the utils
    var output = util.output;
    
    // Require the test so we can run beforeAll and afterAll commands
    var testModule;
    
    try {
        testModule = require(opts.filepath);
    } catch(e) {
        return onTestFatalError(e);
    }
    
    var onDone = (function() {
        var called = false;
        
        function callbackAsync() {
            setImmediate(callback);
        }
        
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
                    callbackAsync();
                });
            } else {
                callbackAsync();
            }
            
            output.end();
        };
    }());
    
    function writeOutput(cont) {
        util.writeToStream(cont);
    }
    
    function onTestFatalError(err) {
        output.end();
        
        forks.forEach(function(worker) {
            worker.kill();
        });
        
        onDone = _.noop;
        callback = _.once(callback);
        
        callback(err);
    }
    
    if (!_.isFunction(testModule.test)) {
        return onTestFatalError(new Error('no test method was found in ' + opts.filepath));
    }
    
    function onThreadReady(msg) {
        ready += 1;

        if (ready === forks.length) {
            // we are going to this just once here, because
            // hoisting, and because lazy
            
            /* eslint-disable no-use-before-define */
            startTests();
            /* eslint-enable no-use-before-define */
        }
    }

    function onReport(msg) {
        writeOutput(msg);
    }
    
    function onWorkerMessage(id) {
        
        function onTick(msg) {
            running -= 1;
            
            repeater.emit('tick');
            
            if (complete && running === 0) {
                onDone();
            }
        }
        
        function onError(msg, type) {
            type = type || 'error';
            util.debugError('worker', id, type);
            util.debugError(msg.error.message, '\n', msg.error.stack);
        }
        
        function onFatalError(msg) {
            onError(msg, 'fatalError');
            onTestFatalError(msg.error);
        }
        
        function onUnknown(msg) {
            util.debugError('unknown message', msg);
        }
        
        return function onMessageHandler(msg) {
            
            if (msg === enums.message.ready) {
                onThreadReady(msg);
            } else if (msg === enums.message.tick) {
                onTick(msg);
            } else if (msg.type && msg.type === 'report') {
                onReport(msg);
                onTick();
            } else if (msg.type && msg.type === 'error') {
                onError(msg);
            } else if (msg.type && msg.type === 'fatalError') {
                onFatalError(msg);
            } else {
                onUnknown(msg);
            }
            
        };
    }
    
    // create as many threads as necessary
    _.times(threads, function() {
        var id = forks.length;
        var worker = child.fork(forkFile, ['--worker=' + id]);
        worker.on('message', onWorkerMessage(id));
        
        // TODO
//        worker.on('error', console.log.bind(console, 'error'));
//        worker.on('disconnect', console.log.bind(console, 'disconnect'));
//        worker.on('close', console.log.bind(console, 'close'));
//        worker.on('exit', console.log.bind(console, 'exit'));
        
        forks.push(worker);
    });
    
    // initialie each thread
    forks.forEach(function(worker) {
        worker.send({
            command: 'init',
            filepath: opts.filepath,
            timeout: opts.timeout > 0 ? opts.timeout : 0
        });
    });
    
    function onBeforeAll(next) {
        next = ensureAsync(next);
        var context = {};
        
        if (testModule && _.isFunction(testModule.beforeAll)) {
            testModule.beforeAll.call(context, function beforeAllDone() {
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
    
    var thread = currentThread(forks.length);
    
    function runNew(context) {
        running += 1;
        
        var worker = forks[thread()];
        
        worker.send({
            command: 'run',
            context: context
        });
    }
    
    function runArgs() {
        return {
            options: opts,
            debug: util.debug,
            writeOutput: writeOutput,
            runTest: runNew,
            getRunningCount: function() {
                return running;
            },
            repeater: repeater
        };
    }
    
    function runAtRate() {
        var run = require('./run-rate-mode.js');
        
        return run(runArgs());
    }
    
    function runConcurrently() {
        var run = require('./run-concurrent-mode.js');
        
        return run(runArgs());
    }
    
    function createTestsTask() {
        var modeFunc;
        
        if (opts.rate) {
            modeFunc = runAtRate;
        } else if (opts.concurrent) {
            modeFunc = runConcurrently;
        } else {
            modeFunc = function() {
                return {
                    _start: function(c, n) {
                        process.nextTick(n);
                    }
                };
            };
        }
        
        return modeFunc();
    }
    
    function onAfterAll(context, next) {
        next = ensureAsync(next);
        
        if (testModule && _.isFunction(testModule.afterAll)) {
            return testModule.afterAll.call(context, ignoreParams(next));
        }
        
        next();
    }
    
    // create the test task object
    var task = createTestsTask();
    
    // threads can take up to 300ms to start at times,
    // so we will wait until they are all initialized
    // in order to start running the test
    function startTests() {
        async.waterfall([
            onBeforeAll,
            task._start,
            onAfterAll
        ], function() {
            complete = true;
            
            if (running === 0) {
                onDone();
            }
        });
    }
    
    return task;
}

module.exports = function forkmaster(options, callback) {
    return start(options, callback);
};

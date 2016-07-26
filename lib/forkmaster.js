var path = require('path');
var child = require('child_process');

var _ = require('lodash');
var async = require('async');
var Fraction = require('fractional').Fraction;

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
    
    var objectMode = opts._objectMode;
    
    var util = utils(_.merge({}, opts, {
        output: output,
        objectMode: objectMode
    }));
    
    // wrap the stream to support object mode,
    // easier writing, etc.
    var output = util.wrapStream(opts.output);
    
    // Require the test so we can run beforeAll and afterAll commands
    var testModule;
    
    try {
        testModule = require(opts.filepath);
    } catch(e) {
        return onTestFatalError(e);
    }
    
    if (!_.isFunction(testModule.test)) {
        return onTestFatalError(new Error('no test method was found in ' + opts.filepath));
    }
    
    function writeOutput(cont) {
        util.writeToStream(cont);
    }
    
    function onTestFatalError(err) {
        output.end();
        
        forks.forEach(function(worker) {
            worker.kill();
        });
        
        callback(err);
        
        callback = onDone = _.noop;
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
    
    function onThreadReady(msg) {
        ready += 1;

        if (ready === forks.length) {
            startTests();
        }
    }

    function onReport(msg) {
        writeOutput(msg);
    }
    
    function onMessage(id) {
        
        function onTick(msg) {
            running -= 1;
            
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
            } else if (msg.type && msg.type === 'fatalError') {
                onFatalError(msg);
            } else {
                onUnknown(msg);
            }
            
        };
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
    
    function runAtRate() {
        var interval;
        
        // expect this many test runs total
        var expectedCount = Math.floor(opts.rate * (opts.duration / 1000));
        // make a copy so we can modify it
        var exCount = expectedCount;
        
        function calculateRunValues(rate) {
            var f = new Fraction(opts.rate, 1000);
            
            return {
                rate: rate,
                // every x milliseconds
                intTime: f.denominator,
                // start y amount of tasks
                concurrent: f.numerator
            };
        }
        
        var runValues = calculateRunValues(opts.rate);
        
        writeOutput({
            type: 'header',
            epoch: Date.now(),
            duration: opts.duration,
            rate: opts.rate || null,
            concurrent: opts.concurrent || null,
            targetCount: expectedCount,
            name: opts.testname || null
        });
        
        util.debug(
            'start %d test every %dms for a total of %d',
            runValues.concurrent,
            runValues.intTime,
            expectedCount
        );
        
        function startRunning(context, done) {
            function markForDone() {

                if (interval !== undefined) {
                    clearInterval(interval);
                    interval = undefined;
                }

                done(undefined, context);
            }
            
            interval = setInterval(function() {
                var count = runValues.concurrent;
                var thread = currentThread(forks.length);

                while (count--) {
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
            }, runValues.intTime);
        }
        
        var api = {};
        
        Object.defineProperties(api, {
            _start: {
                enumerable: false,
                configurable: false,
                value: startRunning
            },
            rate: {
                enumerable: true,
                configurable: false,
                get: function() {
                    return runValues.rate;
                },
                set: function(val) {
                    if (!_.isNumber(val) || val <= 0) {
                        throw new TypeError('rate must be a positive number');
                    }
                    
                    if (interval !== undefined && val !== runValues.rate) {
                        // TODO adjust the running tests
                    }
                    
                    runValues = calculateRunValues(val);
                }
            }
        });
        
        return api;
    }

    function runConcurrently() {
        var isRunning = false;
        var concurrent = opts.concurrent;
        var ctx = {};
        
        writeOutput({
            type: 'header',
            epoch: Date.now(),
            duration: opts.duration,
            rate: opts.rate || null,
            concurrent: opts.concurrent || null,
            targetCount: null,
            name: opts.testname || null
        });
        
        util.debug(
            'start %d test and replace each when finished',
            concurrent
        );
        
        function onMessage(msg) {
            if (isRunning && msg.type && msg.type === 'report' && running < concurrent) {
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
                context: ctx
            });
        }
        
        function startRunning(context, done) {
            isRunning = true;
            // replace blank context with the real one
            ctx = context;
            
            var initCount = concurrent;
            
            // start the necessary amount of tests
            while (initCount--) {
                startNew();
            }

            // set timeout for the duration
            setTimeout(function() {
                isRunning = false;
                done(undefined, context);
            }, opts.duration);
        }
        
        var api = {};
        
        Object.defineProperties(api, {
            _start: {
                enumerable: false,
                configurable: false,
                value: startRunning
            },
            concurrent: {
                enumerable: true,
                configurable: false,
                get: function() {
                    return concurrent;
                },
                set: function(val) {
                    if (!_.isInteger(val) || val < 1) {
                        throw new TypeError('concurrent must be a positive non-zero integer');
                    }
                    
                    if (isRunning && val > concurrent) {
                        // user is raising concurrency, so start
                        // some new tests
                        _.times(val - concurrent, startNew);
                    }
                    
                    concurrent = val;
                }
            }
        });
        
        return api;
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
            testModule.afterAll.call(context, ignoreParams(next));
        } else {
            next();
        }
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

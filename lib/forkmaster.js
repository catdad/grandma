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
        callback.call(this);
    };
}

function start(opts, callback) {
    var threads = opts.threads;
    var forks = [];
    var ready = 0;
    
    var interval;
    var running = 0;
    var complete = false;
    
    var objectMode = opts._objectMode;
    
    // expect this many test runs total
    var expectedCount = Math.floor(opts.rate * (opts.duration / 1000));
    
    var f = new Fraction(opts.rate, 1000);
    // every x milliseconds
    var intTime = f.denominator;
    // start y amount of tasks
    var concurrent = f.numerator;
    
    var util = utils(_.merge({}, opts, {
        output: output,
        objectMode: objectMode,
        expectedCount: expectedCount
    }));
    
    // wrap the stream to support object mode,
    // easier writing, etc.
    var output = util.wrapStream(opts.output);
    
    // Require the test so we can run beforeAll and afterAll commands
    var tests;
    
    try {
        tests = require(opts.filepath);
    } catch(e) {
        return onTestFatalError(e);
    }
    
    if (!_.isFunction(tests.test)) {
        return onTestFatalError(new Error('no test method was found in ' + opts.filepath));
    }
    
    // TODO this message is actually only for rate mode,
    // so it should probably move inside the rate mode
    // function, and a similar message should be available
    // for concurrency mode
    util.debug(
        'start %d test every %dms for a total of %d',
        concurrent,
        intTime,
        expectedCount
    );
    
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
        util.writeReport(msg);
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
    
    // write the header
    util.writeHeader();
    
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
    
    function runAtRate() {
        var exCount = expectedCount;
        
        function startRunning(context, done) {
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
            }, intTime);
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
                get: function() {},
                set: function() {}
            }
        });
        
        return api;
    }

    function runConcurrently() {
        var isRunning = false;
        var concurrent = opts.concurrent;
        var ctx = {};
        
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
    
    function runTests(context, next) {
        var modeFunc;
        
        if (opts.rate) {
            modeFunc = runAtRate;
        } else if (opts.concurrent) {
            modeFunc = runConcurrently;
        } else {
            modeFunc = function(c, n) {
                process.nextTick(n);
            };
        }
        
        return modeFunc(context, next);
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
        var test = runTests();
        
        async.waterfall([
            onBeforeAll,
            test._start,
            onAfterAll
        ], function() {
            
            complete = true;
            
            if (running === 0) {
                onDone();
            }
        });
        
        return test;
    }
}

module.exports = function forkmaster(options, callback) {
    return start(options, callback);
};

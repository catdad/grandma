var path = require('path');
var child = require('child_process');

var _ = require('lodash');
var async = require('async');

var enums = require('./enums.js');
var utils = require('./run-utils.js');
var runner = require('./runner.js');

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

function propProxy(from, to, name) {
    if (from.hasOwnProperty(name)) {
        Object.defineProperty(to, name, {
            configurable: false,
            enumerable: true,
            get: function() {
                return from[name];
            },
            set: function(val) {
                from[name] = val;
            }
        });
    }
}

function publicTaskApi(task) {
    // prepare the public API object
    var taskApi = {
        pause: task.pause.bind(task),
        resume: task.resume.bind(task),
        stop: task.stop.bind(task)
    };
    
    propProxy(task, taskApi, 'concurrent');
    propProxy(task, taskApi, 'rate');
    
    return taskApi;
}

function start(opts, callback) {
    var threads = opts.threads;
    var forks = [];
    var ready = 0;

    var running = 0;
    var complete = false;
    
    var objectMode = opts._objectMode;
    
    var util = utils(_.merge({}, opts, {
        objectMode: objectMode
    }));
    
    // get the wrapped stream from the utils
    var output = util.output;
    
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
    
    var onTestFatalError = function onTestFatalError(err) {
        output.end();

        forks.forEach(function(worker) {
            worker.kill();
        });

        onDone = _.noop;
        callback = _.once(callback);

        callback(err);
    };
    
    // perform validation for the module
    var testModule;
    
    // Require the test so we can run beforeAll and afterAll commands
    try {
        testModule = require(opts.filepath);
    } catch(e) {
        return onTestFatalError(e);
    }
    
    // Make sure test module has the required properties
    if (!_.isFunction(testModule.test)) {
        return onTestFatalError(new Error('no test method was found in ' + opts.filepath));
    }
    
    var handlers = {
        onTestFatalError: onTestFatalError,
        onThreadReady: function onThreadReady(msg) {
            ready += 1;

            if (ready === forks.length) {
                // we are going do this just once here, because
                // hoisting, and because lazy

                // eslint-disable-next-line no-use-before-define
                startTests();
            }
        },
        onReport: function onReport(msg) {
            util.writeToStream(msg);
        },
        onTick: function onTick(msg) {
            running -= 1;
            
            task.emit(task.EVENTS.COMPLETE);
            
            if (complete && running === 0) {
                onDone();
            }
        },
        onWorkerMessage: function onWorkerMessage(id) {
        
            function onError(msg, type) {
                type = type || 'error';
                util.debugError('worker', id, type);
                util.debugError(msg.error.message, '\n', msg.error.stack);
            }

            function onFatalError(msg) {
                onError(msg, 'fatalError');
                handlers.onTestFatalError(msg.error);
            }

            function onUnknown(msg) {
                util.debugError('unknown message', msg);
            }

            return function onMessageHandler(msg) {

                if (msg === enums.message.ready) {
                    handlers.onThreadReady(msg);
                } else if (msg === enums.message.tick) {
                    handlers.onTick(msg);
                } else if (msg.type && msg.type === 'report') {
                    handlers.onReport(msg);
                    handlers.onTick();
                } else if (msg.type && msg.type === 'error') {
                    onError(msg);
                } else if (msg.type && msg.type === 'fatalError') {
                    onFatalError(msg);
                } else {
                    onUnknown(msg);
                }

            };
        }
    };
    
    // create as many threads as necessary
    _.times(threads, function() {
        var id = forks.length;
        var worker = child.fork(forkFile, ['--worker=' + id]);
        worker.on('message', handlers.onWorkerMessage(id));
        
//        worker.on('error', console.log.bind(console, 'error'));
//        worker.on('disconnect', console.log.bind(console, 'disconnect'));
//        worker.on('close', console.log.bind(console, 'close'));
//        worker.on('exit', console.log.bind(console, 'exit'));
        
        forks.push(worker);
    
        return worker;
    }).forEach(function(worker) {
        // initialie each thread
        worker.send({
            command: 'init',
            filepath: opts.filepath,
            timeout: opts.timeout > 0 ? opts.timeout : 0
        });
    });
    
    function execBeforeAll(next) {
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
        
    function createTestsTask() {
        
        var api = runner({
            mode: opts.concurrent ? 'concurrent' : 'rate',
            debug: util.debug,
            options: opts,
            writeOutput: handlers.onReport
        });
        
        api.on('task:run', function runNew(ev) {
            running += 1;

            var worker = forks[thread()];

            worker.send({
                command: 'run',
                context: ev.context
            });
        });
        
        return api;
    }
    
    function execAfterAll(context, next) {
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
            execBeforeAll,
            task._start,
            execAfterAll
        ], function() {
            complete = true;
            
            if (running === 0) {
                onDone();
            }
        });
    }
    
    return publicTaskApi(task);
}

module.exports = function forkmaster(options, callback) {
    return start(options, callback);
};

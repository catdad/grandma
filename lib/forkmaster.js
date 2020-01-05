var path = require('path');
var child = require('child_process');

var _ = require('lodash');
var async = require('async');

var enums = require('./enums.js');
var threadUtils = require('./thread-utils.js');
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

function createWorkers(opts, done) {
    var count = opts.threads;

    // create as many threads as necessary
    var forks = _.times(count, function(id) {
        var worker = child.fork(forkFile, ['--worker=' + id]);

        // worker.on('error', console.log.bind(console, 'error'));
        // worker.on('disconnect', console.log.bind(console, 'disconnect'));
        // worker.on('close', console.log.bind(console, 'close'));
        // worker.on('exit', console.log.bind(console, 'exit'));

        return worker;
    });

    var thread = currentThread(forks.length);

    return {
        on: function(name, func) {
            forks.forEach(function(fork, i) {
                fork.on(name, function(ev) {
                    func(ev);
                });
            });
        },
        off: function(name, func) {
            forks.forEach(function(fork) {
                fork.removeListener(name, func);
            });
        },
        sendAll: function(msg) {
            forks.forEach(function(fork) {
                fork.send(msg);
            });
        },
        send: function(msg) {
            var fork = forks[thread()];

            fork.send(msg);
        },
        killAll: function(cb) {
            // TODO: figure out why async didn't work here
            // I was getting scenarios where each individual next
            // would be called, but the overall async.each callback would
            // not be called, and it actually caused the process to exit
            var calls = 0;
            var error = null;

            for (var i = 0, l = forks.length; i < l; i++) {
                // eslint-disable-next-line no-loop-func
                (function(fork) {
                    var next = _.once(function(e) {
                        error = error || e || null;
                        calls += 1;

                        if (calls === l) {
                            return cb(error);
                        }
                    });

                    fork.once('exit', next);
                    fork.once('error', next);

                    fork.kill();
                }(forks[i]));
            }
        }
    };
}

function start(opts, callback) {
    var threads = opts.threads;
    var ready = 0;
    var workers;

    var running = 0;
    var complete = false;

    var objectMode = opts._objectMode;

    var util = utils(_.merge({}, opts, {
        objectMode: objectMode
    }));

    function killAllWorkers(next) {
        if (!workers) {
            return next();
        }

        return workers.killAll(next);
    }

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

            async.parallel([
                function(next) {
                    workers.killAll(next);
                },
                function(next) {
                    if (output && !output._fullEnd) {
                        output.on('fullEnd', function() {
                            next();
                        });

                        output.end();

                        return;
                    }

                    output.end();
                    next();
                }
            ], function() {
                callbackAsync();
            });
        };
    }());

    var onTestFatalError = function onTestFatalError(err) {
        output.end();

        onDone = _.noop;
        callback = _.once(callback);

        killAllWorkers(function() {
            callback(err);
        });
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

    var task;
    var handlers = {
        onTestFatalError: onTestFatalError,
        onError: function onError(msg, type) {
            type = type || 'error';
            util.debugError(
                'worker', msg.id, type, '\n',
                msg.error.message, '\n',
                msg.error.stack
            );
        },
        onFatalError: function onFatalError(msg) {
            handlers.onError(msg, 'fatalError');
            handlers.onTestFatalError(msg.error);
        },
        onUnknown: function onUnknown(msg) {
            util.debugError('unknown message', msg);
        },
        onThreadReady: function onThreadReady(msg) {
            ready += 1;

            if (ready === threads) {
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
        onWorkerMessage: function onWorkerMessage(msg) {

            if (msg === enums.message.ready) {
                handlers.onThreadReady(msg);
            } else if (msg === enums.message.tick) {
                handlers.onTick(msg);
            } else if (msg.type && msg.type === 'report') {
                handlers.onReport(msg);
                handlers.onTick();
            } else if (msg.type && msg.type === 'error') {
                handlers.onError(msg);
            } else if (msg.type && msg.type === 'fatalError') {
                handlers.onFatalError(msg);
            } else {
                handlers.onUnknown(msg);
            }

        }
    };

    workers = createWorkers({
        threads: threads
    });

    workers.on('message', handlers.onWorkerMessage);

    // initialie each thread
    workers.sendAll({
        command: 'init',
        filepath: opts.filepath,
        timeout: opts.timeout > 0 ? opts.timeout : 0
    });

    function execBeforeAll(next) {
        next = ensureAsync(next);

        var context = {
            data: {}
        };
        var isRunnableTask = testModule && _.isFunction(testModule.beforeAll);

        if (!isRunnableTask) {
            return next(null, context);
        }

        testModule.beforeAll.call(context, function beforeAllDone() {
            return next(null, threadUtils.reduceThreadSafe(context, true));
        });
    }

    function execAfterAll(context, next) {
        next = ensureAsync(next);

        if (testModule && _.isFunction(testModule.afterAll)) {
            return testModule.afterAll.call(context, ignoreParams(next));
        }

        next();
    }

    // create the test task object
    task = runner({
        mode: opts.concurrent ? 'concurrent' : 'rate',
        debug: util.debug,
        options: opts,
        // TODO this should just be a task event
        writeOutput: handlers.onReport
    });

    task.on(task.EVENTS.RUN, function runNew(ev) {
        running += 1;

        workers.send({
            command: 'run',
            context: ev.context
        });
    });

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

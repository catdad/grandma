var util = require('util');

var _ = require('lodash');
var async = require('async');

var argv = require('yargs').argv;
var workerId = argv.worker;

var enums = require('./enums.js');
var threadUtils = require('./thread-utils.js');
var now;
var Timer;

function initTimer() {
    now = require('./now.js');
    Timer = now.Timer;
}

var reporter = (function() {
    function ensureObj(obj) {
        return _.isPlainObject(obj) ? obj : {};
    }

    function sendMessageAsync(obj) {
        setTimeout(function() {
            process.send(obj);
        }, 0);
    }

    function sendMessage(obj) {
        if (typeof obj === 'number') {
            return sendMessageAsync(obj);
        }

        obj = ensureObj(obj);
        obj = _.merge({}, obj, {
            id: workerId
        });

        sendMessageAsync(obj);
    }

    return {
        error: function(err) {
            sendMessage({
                type: 'error',
                error: err
            });
        },
        fatalError: function(err) {
            sendMessage({
                type: 'fatalError',
                error: err
            });
        },
        tick: function(obj) {
//            sendMessage(enums.message.tick);
        },
        ready: function() {
            sendMessage(enums.message.ready);
        },
        report: function(obj) {
            sendMessage({
                type: 'report',
                report: obj.report,
                categories: obj.categories,
                metrics: obj.metrics,
                data: obj.data
            });
        }
    };
}());

function decorateTest(testFunc, timeout, context) {
    var categories = [];
    var metrics = {};

    function addCategory() {
        categories = categories.concat(_.flattenDeep([].slice.call(arguments)).filter(_.isString));
    }

    function addMetric(name, value) {
        metrics[name] = Number(value);
    }

    return function(done) {
        var timer = new Timer(context || {});
        testFunc = testFunc.bind(timer);

        var to = null;

        Object.defineProperty(timer, 'category', {
            enumerable: true,
            configurable: false,
            get: function() {
                return addCategory;
            }
        });

        Object.defineProperty(timer, 'metric', {
            enumerable: true,
            configurable: false,
            get: function() {
                return addMetric;
            }
        });

        timer.start('fullTest');

        function onDone(err) {
            // always record the time first
            timer.end('fullTest');

            // the timeout was hit, so ignore this
            if (to === undefined) {
                return;
            } else {
                clearTimeout(to);
                to = undefined;
            }

            var reportData = timer.report(
                err ? { fullTest: err } : null
            );

            // make sure the callback is always async,
            // even if the test itself was synchronous
            setImmediate(done, undefined, {
                report: reportData,
                categories: categories,
                metrics: metrics
            });
        }

        if (timeout !== 0) {
            to = setTimeout(function() {
                onDone({
                    errorCode: -1
                });
            }, timeout + 1);
            // Note: we will add 1 millisecond to the timeout
            // because hrtime is timing these to slightly
            // less than the timeout (parts of a millisecond).
            // Adding the little extra means we always wait at
            // least that much.
        }

        testFunc(function(err) {
            onDone(err);
        });
    };
}

function asyncFuncWithoutFailure(asyncFunc, context) {
    return function asyncFuncNoCallbackArgs(done) {
        asyncFunc.call(context, function() {
            // make sure the callback is always async,
            // even if the test itself was synchronous
            setImmediate(done);
        });
    };
}

var testInstance;

function TestRunner(msg) {
    var filepath = msg.filepath;
    var timeout = msg.timeout;
    var test;

    try {
        test = require(filepath);
    } catch(e) {
        return reporter.fatalError(e);
    }

    initTimer();

    function runTest(context) {
        var series = [];
        var reportIdx;

        if (test.beforeEach) {
            series.push(asyncFuncWithoutFailure(test.beforeEach, context));
        }

        series.push(decorateTest(test.test, timeout, context));
        reportIdx = series.length - 1;

        if (test.afterEach) {
            series.push(asyncFuncWithoutFailure(test.afterEach, context));
        }

        async.series(series, function(err, data) {
            // it will not be possible for this to error
            if (err) {
                throw err;
            }

            reporter.report(_.assign(data[reportIdx], {
                data: threadUtils.reduceThreadSafe(context.data, false)
            }));
        });
    }

    return {
        run: runTest
    };
}

function alreadyInitializedError() {
    var err = util.format('worker %s already initialized', workerId);
    reporter.error(new Error(err));
}

function notInitializedError() {
    var err = util.format('worker %s is not initialized', workerId);
    reporter.error(new Error(err));
}

function onInitMessage(msg) {
    if (!testInstance) {
        testInstance = TestRunner(msg);
        reporter.ready();
    } else {
        alreadyInitializedError();
    }
}

function onRunMessage(msg) {
    if (testInstance) {
        testInstance.run(msg.context || {});
    } else {
        notInitializedError();
    }
}

process.on('message', function(msg) {
    switch (msg.command) {
        case 'init':
            return onInitMessage(msg);
        case 'run':
            return onRunMessage(msg);
        default:
            return reporter.error(new Error('unknown command: ' + msg.command));
    }
});

var _ = require('lodash');

function runConcurrently(args, api) {
    
    var opts = args.options;
    var writeOutput = args.writeOutput;
    
    var repeater = api;
    var debug = api.debug;
    var getRunningCount = function() {
        return api.runningCount;
    };
    
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

    debug(
        'start %d test and replace each when finished',
        concurrent
    );

    function startNew() {
        api.emit('task:run:internal', ctx);
    }

    function onTestDone() {
        if (isRunning && getRunningCount() < concurrent) {
            startNew();
        }
    }
    
    repeater.on('tick', onTestDone);

    function startRunning(context, done) {
        isRunning = true;
        // replace blank context with the real one
        ctx = context;

        var initCount = concurrent;
        var durationTimeout;

        // start the necessary amount of tests
        while (initCount--) {
            startNew();
        }

        function stopRunning() {
            if (durationTimeout) {
                clearTimeout(durationTimeout);
                durationTimeout = undefined;
            }

            // just in case it's called twice,
            // we don't want to stop it twice
            if (isRunning) {
                isRunning = false;
                done(undefined, context);
            }
        }

        // set timeout for the duration
        durationTimeout = opts.duration === 0 ?
            null :
            setTimeout(stopRunning, opts.duration);

        return stopRunning;
    }

    var stopFunc;
    var noStart = false;

    return Object.defineProperties(api, {
        _start: {
            enumerable: false,
            configurable: false,
            value: function(context, done) {
                if (noStart) {
                    done(undefined, context);
                } else {
                    stopFunc = startRunning(context, done);
                }
            }
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
        },
        stop: {
            enumerable: true,
            configurable: false,
            // [breaking] - this should be false
            writable: true,
            value: function() {
                if (stopFunc) {
                    stopFunc();
                } else {
                    noStart = true;
                }
            }
        }
    });
}

module.exports = runConcurrently;

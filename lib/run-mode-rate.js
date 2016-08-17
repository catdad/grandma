var _ = require('lodash');

var rateValues = require('./run-rate-values.js');

function runAtRate(args) {
    
    var opts = args.options;
    var debug = args.debug;
    var writeOutput = args.writeOutput;
    var runTest = args.runTest;
    
    // These are available, but not currently used
    // in rate mode.
//    var getRunningCount = args.getRunningCount;
//    var repeater = args.repeater;
    
    var isRunning = false;

    // expect this many test runs total
    var expectedCount = Math.floor(opts.rate * (opts.duration / 1000));
    // make a copy so we can modify it
    var exCount = expectedCount;

    var runValues = rateValues(opts.rate);

    writeOutput({
        type: 'header',
        epoch: Date.now(),
        duration: opts.duration,
        rate: opts.rate || null,
        concurrent: opts.concurrent || null,
        targetCount: expectedCount,
        name: opts.testname || null
    });

    debug(
        'start %d test every %dms for a total of %d',
        runValues.concurrent,
        runValues.intTime,
        expectedCount
    );

    function startRunning(context, done) {
        var timeout;

        function markForDone() {
            isRunning = false;

            if (timeout !== undefined) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            done(undefined, context);
        }

        function iterationFunc() {
            if (isRunning) {
                // set a new timeout
                timeout = setTimeout(iterationFunc, runValues.intTime);
            }

            var count = runValues.concurrent;

            while (count--) {
                runTest(context);

                exCount--;
            }

            if (!isRunning) {
                markForDone();
            }
        }

        isRunning = true;

        // Technically, we should just start an iteration here
        // right away, but the original implementation used
        // setInterval, which executes tail end. It would break
        // tests if we start an iteration right away, so I have
        // to assume that I should keep this for back-compat.
        timeout = setTimeout(iterationFunc, runValues.intTime);

        var durationTimeout = setTimeout(function() {
            durationTimeout = undefined;
            isRunning = false;
        }, opts.duration);

        return function stopRunning() {
            // kill the duration timeout
            if (durationTimeout) {
                clearTimeout(durationTimeout);
                durationTimeout = undefined;
            }

            // kill the next queued run
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }

            // just in case it's called twice,
            // we don't want to stop it twice
            if (isRunning) {
                isRunning = false;
                markForDone();
            }
        };
    }

    var stopFunc;
    var noStart = false;

    var api = {
        stop: function() {
            if (stopFunc) {
                stopFunc();
            } else {
                noStart = true;
            }
        }
    };

    Object.defineProperties(api, {
        _start: {
            enumerable: false,
            configurable: false,
            value: function(context, done) {
                if (noStart) {
                    return done(undefined, context);
                } else {
                    stopFunc = startRunning(context, done);
                }
            }
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

                if (val !== runValues.rate) {
                    runValues = rateValues(val);
                }
            }
        }
    });

    return api;
}

module.exports = runAtRate;

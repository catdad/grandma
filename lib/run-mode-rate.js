var _ = require('lodash');

var rateValues = require('./run-rate-values.js');

function runAtRate(api) {
    
    var opts = api.options;
    var debug = api.debug;
    var writeOutput = api.writeOutput;
    
    var isRunning = false;

    // expect this many test runs total
    var expectedCount = api.expectedCount;

    var runValues = rateValues(opts.rate);
    
    function writeHeader() {
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
            runValues.rate,
            runValues.intTime,
            expectedCount
        );
    }

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
                api.emit('task:run:internal', context);
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

        var durationTimeout = opts.duration === 0 ?
            null :
            setTimeout(function() {
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

    return Object.defineProperties(api, {
        _startX: {
            enumerable: false,
            configurable: false,
            value: function(context, done) {
                writeHeader();
                
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

module.exports = runAtRate;

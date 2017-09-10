var EventEmitter = require('events');

var modes = {
    rate: require('./run-mode-rate.js'),
    concurrent: require('./run-mode-concurrent.js')
};

var events = {
    START: 'start',
    RUN: 'task:run',
    RUN_INTERNAL: 'task:run:internal',
    COMPLETE: 'task:complete'
};

module.exports = function taskCreator(opts) {
    var mode = opts.mode;
    var paused = false;
    var ranAtPauseContexts = [];
    var running = 0;
    
    var modeFunc = modes[mode] || function() {
        return {
            _start: function(c, n) {
                process.nextTick(n);
            }
        };
    };

    var api = Object.defineProperties(new EventEmitter(), {
        paused: {
            enumerable: true,
            configurable: false,
            get: function() {
                return paused;
            }
        },
        runningCount: {
            enumerable: true,
            configurable: false,
            get: function() {
                return running;
            }
        },
        expectedCount: {
            enumerable: true,
            configurable: false,
            get: function() {
                var options = opts.options;

                if (!options.rate) {
                    return null;
                }

                return options.duration === 0 ?
                    null :
                    Math.floor(options.rate * (options.duration / 1000));
            }
        },
        EVENTS: {
            enumerable: false,
            configurable: false,
            value: events,
            writable: false
        }
    });
    
    // TODO I don't like these props... how should these
    // be handled in the new API?
    // Maybe add a 'debug' and 'metadata' events, which the runner
    // can translate to these functions?
    api.debug = opts.debug;
    api.writeOutput = opts.writeOutput;
    api.options = opts.options;
    
    // TODO handle #stop in this shared API, triggering
    // a terminate event for the run mode helpers to use
    
    // TODO maybe overload the emit event in order
    // to whitelist some public events that can be
    // emitted through this api
    
    api.on(events.RUN_INTERNAL, function(context) {
        if (paused) {
            ranAtPauseContexts.push(context);
            return;
        }
        
        running += 1;
        
        api.emit(events.RUN, {
            context: context
        });
    });
 
    api.on(events.COMPLETE, function() {
        running -= 1;
        
        // TODO the underlying run helper should just
        // use complete
        api.emit('tick');
    });
    
    api.once(events.START, function() {
        api._start();
    });
        
    api.pause = function() {
        paused = true;
    };

    api.resume = function() {
        paused = false;
        var context;

        // flush any tests that are expected
        // from before the test was paused
        while (ranAtPauseContexts.length) {
            context = ranAtPauseContexts.shift();
            
            api.emit(events.RUN, {
                context: context
            });
        }
    };
    
    modeFunc(api);
    
    return api;
};

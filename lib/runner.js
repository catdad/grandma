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

    var api = new EventEmitter();
    api.debug = opts.debug;
    
    Object.defineProperties(api, {
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
        EVENTS: {
            enumerable: false,
            configurable: false,
            value: events,
            writable: false
        }
    });
    
    modeFunc(opts, api);
    
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
        // use complete and the original api object
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
    
    return api;
};

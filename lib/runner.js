var EventEmitter = require('events');

var _ = require('lodash');

var modes = {
    rate: require('./run-mode-rate.js'),
    concurrent: require('./run-mode-concurrent.js')
};

var events = {
    START: 'start',
    RUN: 'task:run',
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

    // TODO replace this with api.running
    opts.getRunningCount = function() {
        return running;
    };
    
    // TODO replace with the api object itself
    opts.repeater = new EventEmitter();
    
    opts.runTest = function(context) {
        if (paused) {
            ranAtPauseContexts.push(context);
            return;
        }
        
        running += 1;
        
        api.emit(events.RUN, {
            context: context
        });
    };
    
    var newApi = new EventEmitter();
    newApi.debug = opts.debug;
    
    // TODO run mode modules should have access to this API
    // object, so they can use the event emitter.
    var api = modeFunc(opts, newApi);
    
    // TODO handle #stop in this shared API, triggering
    // a terminate event for the run mode helpers to use
    
    _.extend(api, newApi);
    
    // TODO maybe overload the emit event in order
    // to whitelist some public events that can be
    // emitted through this api
 
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
    
    return Object.defineProperties(api, {
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
};

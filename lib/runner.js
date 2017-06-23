var util = require('util');
var EventEmitter = require('events');

var modes = {
    rate: require('./run-mode-rate.js'),
    concurrent: require('./run-mode-concurrent.js')
};

module.exports = function taskCreator(opts) {
    var mode = opts.mode;
    var paused = false;
    var ranAtPause = 0;
    var running = 0;
    
    var modeFunc = modes[mode] || function() {
        return {
            _start: function(c, n) {
                process.nextTick(n);
            }
        };
    };
    
    // TODO run mode modules should have access to this API
    // object, so they can use the event emitter.
    var api = modeFunc();
    
    // TODO handle #stop in this shared API, triggering
    // a terminate event for the run mode helpers to use
    
    EventEmitter.call(api);
    util.inherits(api, EventEmitter);
    
    // TODO maybe overload the emit event in order
    // to whitelist some public events that can be
    // emitted through this api
 
    // TODO this will be triggered by listening
    // on an event
    var wrappedTask = function() {
        if (paused) {
            ranAtPause += 1;
            return;
        }
        
        running += 1;
        
        api.emit('run');
    };
        
    api.pause = function() {
        paused = true;
    };

    api.resume = function() {
        paused = false;

        // flush any tests that are expected
        // from before the test was paused
        while (ranAtPause--) {
            api.emit('run');
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
        }
    });
};

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
    
    var api = modeFunc();
    
    util.inherits(api, EventEmitter);
 
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

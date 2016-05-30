var util = require('util');
var enums = require('./enums.js');

var optPrefix = 'debug';
var envPrefix = 'GRANDMA_DEBUG_';

var LogLevels = enums({
    None: 0,
    Log: 1,
    Error: 2
});

function allowLog(options, levelName) {
    if (options[optPrefix + levelName] || process.env[envPrefix + levelName.toUpperCase()]) {
        return true;
    }
    
    return false;
}

module.exports = function logger(options) {
    var stdout = options.stdout || process.stdout;
    var stderr = options.stderr || process.stderr;
    
    function logAtLevel(level, stream) {
        return function() {
            if (allowLog(options, level)) {
                stream.write(util.format.apply(util, arguments) + '\n');
            }
        };
    }
    
    return {
        log: logAtLevel(LogLevels.fromValue(LogLevels.Log), stdout),
        error: logAtLevel(LogLevels.fromValue(LogLevels.Error), stderr)
    };
};

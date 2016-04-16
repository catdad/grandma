/* jshint node: true */

var util = require('util');
var enums = require('./enums.js');

var LogLevels = enums({
    None: 0,
    Log: 1,
    Error: 2
});

function allowLog(options, level) {
    var levelName = LogLevels.fromValue(level);
    
    if (options['debug' + levelName] || process.env['GRANDMA_DEBUG_' + levelName.toUpperCase()]) {
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
        log: logAtLevel(LogLevels.Log, stdout),
        error: logAtLevel(LogLevels.Error, stderr)
    };
};

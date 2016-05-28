/* jshint node: true */

var path = require('path');

var run = require('./lib/run');
var report = require('./lib/report');

module.exports = {
    run: run,
    report: report,
    cliPath: function() {
        return path.resolve(__dirname, 'lib/cli');
    }
};

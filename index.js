var path = require('path');

var run = require('./lib/run');
var report = require('./lib/report');
var diff = require('./lib/report-diff');

module.exports = {
    run: run,
    report: report,
    fastDiff: diff,
    cliPath: function() {
        return path.resolve(__dirname, 'lib/cli');
    }
};

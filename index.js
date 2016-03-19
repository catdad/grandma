/* jshint node: true */

var async = require('async');
var forkmaster = require('./lib/forkmaster');

function grandma(options) {
    
    var testsToRun = options.tests.map(function(opts) {
        return function runSingleTest(done) {
            forkmaster({
                threads: options.threads,
                filepath: opts.path
            }, done);
        };
    });
    
    async.series(testsToRun, function() {
        console.log('all tests are done');
        process.exit(0);
    });
}

module.exports = grandma;

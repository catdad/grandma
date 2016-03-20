/* jshint node: true */

var _ = require('lodash');
var async = require('async');
var Duration = require('duration-js');

var forkmaster = require('./forkmaster');

function validateOpts(options) {
    // really, this should be using garry,
    // but it is not written yet
    
    var durationIsValidString = _.isString(options.duration) && /\d+(ms|[smhdw])$/.test(options.duration);
    var durationIsNumber = _.isNumber(options.duration);
    if (durationIsValidString || durationIsNumber) {
        options.duration = (new Duration(options.duration)).milliseconds();
    } else {
        return new Error(options.duration === undefined ?
            'duration is not defined' :
            'duration is invalid');
    }
    
    if (!_.isNumber(options.rate) || options.rate === 0) {
        return new Error(options.rate === undefined ?
            'rate is not defined' :
            'rate is invalid');
    }
    
    return options;
}

function grandma(options, callback) {
    
    options = validateOpts(options);
    
    if (options instanceof Error) {
        return async.setImmediate(callback.bind(undefined, options));
    }
    
    console.log(options);
    
    var testsToRun = options.tests.map(function(opts) {
        return function runSingleTest(done) {
            forkmaster(_.merge({
                filepath: opts.path
            }, options), done);
        };
    });
    
    async.series(testsToRun, function() {
        console.log('all tests are done');
        callback();
    });
}

module.exports = grandma;

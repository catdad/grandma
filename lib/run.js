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
    
    if (options.rate === undefined && options.concurrent === undefined) {
        return new Error('either options.rate or options.concurrent is required');
    }
    
    if (options.rate !== undefined) {
        if (!_.isNumber(options.rate) || options.rate === 0) {
            return new Error('rate is invalid');
        }
    } else {
        // hack to enable concurrency mode,
        // since formaster expects this to be defined
        options.rate = 0;
    }
    
    if (options.concurrent !== undefined) {
        if (!_.isNumber(options.concurrent) || options.concurrent === 0) {
            return new Error('concurrent is invalid');
        }
    }
    
    return options;
}

function run(options, callback) {
    
    options = validateOpts(options);
    
    if (options instanceof Error) {
        return async.setImmediate(callback.bind(undefined, options));
    }
    
    var testsToRun = options.tests.map(function(opts) {
        return function runSingleTest(done) {
            forkmaster(
                _.merge({
                    filepath: opts.path,
                    // set default values
                    threads: 1
                }, options),
                done
            );
        };
    });
    
    async.series(testsToRun, function() {
        callback();
    });
}

module.exports = run;

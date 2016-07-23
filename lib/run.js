var util = require('util');

var _ = require('lodash');
var async = require('async');
var Duration = require('duration-js');

var isStream = require('./is-stream.js');
var forkmaster = require('./forkmaster.js');

function validateNumberProp(opts, prop) {
    if (opts[prop] !== undefined && (!_.isNumber(opts[prop]) || opts[prop] === 0)) {
        throw new Error(prop + ' is invalid');
    }
}

function validateDurationProp(opts, prop, required) {
    var val = opts[prop];
    var isValidString = _.isString(val) && /\d+(ms|[smhdw])$/.test(val);
    var isNumber = _.isNumber(val);
    
    if (isValidString || isNumber) {
        opts[prop] = (new Duration(val)).milliseconds();
    } else if (required) {
        throw new Error(val === undefined ?
            util.format('%s is not defined', prop) :
            util.format('%s is invalid', prop));
    } else {
        opts[prop] = undefined;
    }
}

function validateOpts(options) {
    // really, this should be using garry,
    // but it is not written yet
    
    var objectMode = false;
    
    try {
        isStream.assertObjectStream(options.output, 'writable', '');
        // yay, and object stream... so we will use object mode
        objectMode = true;
    } catch(e) {
        // Ignore the above error, we are only using it to validate
        // object mode. We'll still check for a regular writable stream
        // here and use it anyway.
        isStream.assertStream(options.output, 'writable', 'no writable output stream defined');
    }
    
    validateDurationProp(options, 'duration', true);
    validateDurationProp(options, 'timeout', false);
    
    if (options.rate === undefined && options.concurrent === undefined) {
        throw new Error('either options.rate or options.concurrent is required');
    }
    
    validateNumberProp(options, 'rate');
    validateNumberProp(options, 'concurrent');

    if (options.rate < 0 || Math.floor(options.rate * (options.duration / 1000)) < 1) {
        throw new Error('duration is too low');
    }
    
    if (options.concurrent) {
        delete options.rate;
    }
    
    options._objectMode = objectMode;
    
    return options;
}

function runSingleTest(options, callback) {
    delete options.tests;
    
    return forkmaster(_.merge({
        filepath: options.test.path,
        threads: 1
    }, options), callback);
}

function run(options, callback) {
    
    try {
        options = validateOpts(options);
    } catch(e) {
        return async.setImmediate(callback.bind(undefined, e));
    }
    
    return runSingleTest(options, callback);
}

module.exports = run;

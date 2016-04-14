/* jshint node: true */

var _ = require('lodash');

module.exports = function(options, callback) {
    if (!_.isArray(options.tests)) {
        return process.nextTick(callback, new Error('options.tests is not a valid array'));
    }
    
    var testNames = options.tests.map(function(test) {
        return test.name;
    });
    
    process.nextTick(callback, undefined, testNames);
};

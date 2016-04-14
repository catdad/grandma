/* jshint node: true */

var _ = require('lodash');

module.exports = function(options, callback) {
    if (!_.isArray(options.tests)) {
        return setImmediate(callback, new Error('options.tests is not a valid array'));
    }
    
    var testNames = options.tests.map(function(test) {
        return test.name;
    });
    
    setImmediate(callback, undefined, testNames);
};

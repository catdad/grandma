/* jshint node: true */

module.exports = function(options, callback) {
    var testNames = options.tests.map(function(test) {
        return test.name;
    });
    
    process.nextTick(function() {
        callback(undefined, testNames);
    });
};

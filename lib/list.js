/* jshint node: true */

module.exports = function(options, callback) {
    var testNames = options.tests.map(function(test) {
        return test.name;
    });
    
    process.stdout.write(testNames.join('\n') + '\n');
    process.nextTick(callback);
};

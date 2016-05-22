/* jshint node: true */

module.exports = {
    beforeEach: function(done) {
        setImmediate(done, new Error('err in beforeeach'));
    },
    test: function(done) {
        setImmediate(done);
    }
};

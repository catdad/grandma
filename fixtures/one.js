/* jshint node: true */

module.exports = {
    before: function(done) {
        process.nextTick(done);
    },
    beforeEach: function(done) {
        process.nextTick(done);
    },
    test: function(done) {
        process.nextTick(done);
    },
    afterEach: function(done) {
        process.nextTick(done);
    },
    after: function(done) {
        process.nextTick(done);
    }
};

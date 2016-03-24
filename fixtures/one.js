/* jshint node: true */

var loaded = Date.now();

module.exports = {
    beforeEach: function(done) {
        process.nextTick(done);
    },
    test: function(done) {
        console.log('test', Date.now() - loaded);
        process.nextTick(done);
    },
    afterEach: function(done) {
        process.nextTick(done);
    }
};

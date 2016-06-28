module.exports = {
    afterEach: function(done) {
        setImmediate(done, new Error('err in aftereach'));
    },
    test: function(done) {
        setImmediate(done);
    }
};

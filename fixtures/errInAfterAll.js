module.exports = {
    afterAll: function(done) {
        setImmediate(done, new Error('err in afterall'));
    },
    test: function(done) {
        setImmediate(done);
    }
};

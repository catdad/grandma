module.exports = {
    beforeAll: function(done) {
        setImmediate(done, new Error('err in beforeall'));
    },
    test: function(done) {
        setImmediate(done);
    }
};

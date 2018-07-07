module.exports = {
    beforeAll: function(done) {
        this.data.beforeAll = 1;
        this.data.str = 'string value';
        done();
    },
    beforeEach: function(done) {
        this.data.beforeEach = 2;
        done();
    },
    test: function(done) {
        this.data.test = 3;
        done();
    },
    afterEach: function(done) {
        this.data.afterEach = 4;
        done();
    },
    afterAll: function(done) {
        // note: due to #178, we are not testing
        // this one right now
        done();
    }
};

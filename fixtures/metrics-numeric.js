function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    test: function(done) {
        this.metric('one', rnd(5, 10));
        this.metric('two', rnd(300, 500));
        this.metric('three', rnd(30, 100));

        process.nextTick(done);
    }
};

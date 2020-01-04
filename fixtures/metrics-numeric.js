function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var i = 0;
var categories = ['a', 'b'];

module.exports = {
    test: function(done) {
        var that = this;

        this.category(categories[(i++) % categories.length]);

        that.metric('one', rnd(5, 10));
        that.metric('two', rnd(300, 500));
        that.metric('three', rnd(30, 100));

        that.start('four');

        setTimeout(function() {
            that.end('four');
            done();
        }, rnd(1, 5));
    }
};

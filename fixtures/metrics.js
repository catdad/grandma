/* jshint node: true */

var async = require('async');

function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndTime() {
    return rnd(5, 30);
}

function delay(callback) {
    setTimeout(callback, rndTime());
}

module.exports = {
    beforeEach: function(done) {
        this.timeout = rndTime();
        process.nextTick(done);
    },
    test: function(done) {
        var that = this;
        async.parallel([
            function (next) {
                that.start('one');
                
                setTimeout(function() {
                    that.end('one');
                    next();
                }, that.timeout);
            },
            function (next) {
                that.start('two');
                
                setTimeout(function() {
                    that.end('two');
                    next();
                }, that.timeout * 2);
            }
        ], done);
    }
};

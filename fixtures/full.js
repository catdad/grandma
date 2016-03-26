/* jshint node: true */

var http = require('http');

function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndTime() {
    return rnd(5, 30);
}

function delay(callback) {
    setTimeout(callback, rndTime());
}

var VAL = 'puma';

function log(val) {
    if (false) {
        console.log(val);
    }
}

module.exports = {
    beforeAll: function(done) {
        this.val = VAL;
        delay(done);
    },
    beforeEach: function(done) {
        log(this.val);
        delay(done);
    },
    test: function(done) {
        log(this.val);
        delay(done);
    },
    afterEach: function(done) {
        log(this.val);
        delay(done);
    },
    afterAll: function(done) {
        log(this.val);
        delay(done);
    }
};

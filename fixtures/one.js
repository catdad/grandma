/* jshint node: true */

//var loaded = Date.now();
//
//module.exports = {
//    beforeEach: function(done) {
//        process.nextTick(done);
//    },
//    test: function(done) {
//        console.log('test', Date.now() - loaded);
//        process.nextTick(done);
//    },
//    afterEach: function(done) {
//        process.nextTick(done);
//    }
//};

var http = require('http');

module.exports = {
    test: function(done) {
        var req = http.request({
            method: 'GET',
            host: 'localhost',
            path: '/share.txt'
        }, function(res) {
            res.on('data', function() {});
            res.on('end', done);
            res.on('error', done);
        });
        
        req.end();
    }
};

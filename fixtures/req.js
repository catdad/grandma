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

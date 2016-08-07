var http = require('http');

module.exports = {
    test: function(done) {
//        console.log('making request');
        
        var req = http.request({
            method: 'GET',
            host: 'localhost',
            path: '/share.txt'
        }, function(res) {
//            console.log('got response');
            
            res.on('data', function() {});
            res.on('end', function() {
//                console.log('end event');
                done();
            });
            res.on('error', function(err) {
//                console.log('err event');
                done(err);
            });
            
            res.on('close', function() {
//                console.log('close event');
            });
        });
        
//        req.on('error', function(err) {
//            console.log('req err event');
//        });
        
        req.setNoDelay(true);
        
        req.end();
    }
};

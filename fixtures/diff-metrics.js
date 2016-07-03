var async = require('async');

var count = 0;

module.exports = {
    test: function(done) {
        var that = this;
        var n = count % 3;
        var metrics = [];
        
        for (var i = 0; i < n; i++) {
            metrics.push('met' + i);
        }
        
        count += 1;

        async.forEachSeries(metrics, function(val, next) {
            that.start(val);
            
            setTimeout(function() {
                that.end(val);
                next();
            }, 30);
        }, function() {});
        
        var totalTime = Math.max(metrics.length * 30 + 30, 80);
        
        setTimeout(done, totalTime);
    }
};

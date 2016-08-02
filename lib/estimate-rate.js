var estimateDuration = require('./estimate-duration.js');

module.exports = function() {
    var count = 0;
    
    var duration = estimateDuration();
    
    var api = {};
    
    api.include = function include(record) {
        if (!record.report) {
            return api;
        }
        
        duration.include(record);
        count += 1;

        return api;
    };
    
    Object.defineProperty(api, 'result', {
        configurable: false,
        enumerable: true,
        get: function() {
            // avoid divide by zero errors
            var seconds = duration.result / 1000;
            
            if (seconds <= 0) {
                return 0;
            }
            
            return count / seconds;
        }
    });
    
    return api;
};

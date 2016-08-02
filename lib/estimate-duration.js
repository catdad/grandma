module.exports = function() {
    var start = Infinity;
    var end = -Infinity;
    var result = 0;
    
    var api = {};
    
    api.include = function include(record) {
        if (!record.report) {
            return api;
        }
        
        var fulltest = record.report.fullTest;
        
        if (fulltest.start < start) {
            start = fulltest.start;
        }
        
        if (fulltest.end > end) {
            end = fulltest.end;
        }
        
        result = end - start;
        
        return api;
    };
    
    Object.defineProperty(api, 'result', {
        configurable: false,
        enumerable: true,
        get: function() {
            return result;
        }
    });
    
    return api;
};

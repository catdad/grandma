var _ = require('lodash');
var quantile = require('compute-quantile');

function add(a, b) {
    return a + b;
}

function validateData(data) {
    if (!_.isArray(data)) {
        throw new Error('data is not an array');
    }
    
    data.forEach(function(val, i) {
        if (!_.isNumber(val)) {
            throw new Error('data[' + i + '] is not a number');
        }
    });
}

module.exports = {
    // https://github.com/msn0/stats-mean
    mean: function mean(data) {
        validateData(data);
        
        return data.reduce(add, 0) / data.length;
    },
    median: function median(data) {
        validateData(data);
        
        if (data.length % 2 === 0) {
            return (data[data.length / 2 - 1] + data[data.length / 2]) / 2;
        }

        return data[Math.floor(data.length / 2)];
    },
    percentile: function percentile(data, n) {
        validateData(data);
        
        if (!_.isNumber(n)) {
            throw new Error('n is not a number');
        }
        
        if (n < 0 || n > 100) {
            throw new Error('n must be between 0 and 100');
        }
        
        return quantile(data, (n / 100), { sorted: true });
    },
    iqr: function(data) {
        return {
            min: data[0],
            q1: module.exports.percentile(data, 25),
            q2: module.exports.median(data),
            q3: module.exports.percentile(data, 75),
            max: data[data.length - 1]
        };
    }
};

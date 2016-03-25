/* jshint node: true */

var quantile = require('compute-quantile');

// Some of the below code is originally written by msn0
// https://github.com/msn0
// License: MIT

// However, since it includes test libs (like mocha) as
// dependencies instead of devDependencies, I cannot
// use the actual NPM modules.

function add(a, b) {
    return a + b;
}

module.exports = {
    // https://github.com/msn0/stats-mean
    mean: function mean(data) {
        return data.reduce(add, 0) / data.length;
    },
    // https://github.com/msn0/stats-median
    median: function median(data) {
        if (data.length % 2 === 0) {
            return (data[data.length / 2 - 1] + data[data.length / 2]) / 2;
        }

        return data[Math.floor(data.length / 2)];
    },
    percentile: function percentile(data, n) {
        return quantile(data, (n/100), { soted: true });
    }
};
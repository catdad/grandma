/* jshint node: true */

// The below code is originally written by msn0
// https://github.com/msn0
// License: MIT

// However, since it includes test libs (like mocha) as
// dependencies instead of devDependencies, I cannot
// use the actual NPM modules.

function add(a, b) {
    return a + b;
}

function comparator(n, m) {
    return n < m ? -1 : 1;
}

function swap(data, i, j) {
    var tmp;
    if (i === j) {
        return;
    }
    tmp = data[j];
    data[j] = data[i];
    data[i] = tmp;
}

function partition(data, start, end) {
    var pivot = data[start];
    var i, j, tmp;
    for (i = start + 1, j = start; i < end; i++) {
        if (data[i] < pivot) {
            swap(data, i, ++j);
        }
    }
    swap(data, start, j);
    return j;
}

function findK(data, start, end, k) {
    var pos;
    while (start < end) {
        pos = partition(data, start, end);
        if (pos === k) {
            return data[k];
        }
        if (pos > k) {
            end = pos;
        } else {
            start = pos + 1;
        }
    }
}

module.exports = {
    // https://github.com/msn0/stats-mean
    mean: function mean(data) {
        return data.reduce(add, 0) / data.length;
    },
    // https://github.com/msn0/stats-median
    median: function median(data) {
        data.sort(comparator);

        if (data.length % 2 === 0) {
            return (data[data.length / 2 - 1] + data[data.length / 2]) / 2;
        }

        return data[Math.floor(data.length / 2)];
    },
    // https://github.com/msn0/stats-percentile
    percentile: function percentile(data, n) {
        return findK(data.concat(), 0, data.length, Math.ceil(data.length * n / 100) - 1);
    }
};
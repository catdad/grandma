var _ = require('lodash');

// for now, create 1 second bins,
// and use those bins to estimate
// concurrency of the tests
var BIN_INTERVAL = 1000;

module.exports = function() {
    var bins = {};

    var api = {};

    function updateBin(bin) {
        bins[bin] = bins[bin] || 0;
        bins[bin] += 1;
    }

    api.include = function include(record) {
        if (!record.report) {
            return api;
        }

        var fulltest = record.report.fullTest;

        var startBin = parseInt(fulltest.start / BIN_INTERVAL) * BIN_INTERVAL;
        var endBin = parseInt(fulltest.end / BIN_INTERVAL) * BIN_INTERVAL;

        if (startBin === endBin) {
            updateBin(startBin);
        } else {
            _.times((endBin - startBin) / BIN_INTERVAL, function(i) {
                var bin = (BIN_INTERVAL * (i + 1)) + startBin;
                updateBin(bin);
            });
        }

        return api;
    };

    Object.defineProperty(api, 'result', {
        configurable: false,
        enumerable: true,
        get: function() {
            var binCount = _.keys(bins).length;

            if (binCount === 0) {
                return 0;
            }

            return _.reduce(bins, function(sum, val) {
                return sum + val;
            }, 0) / binCount;
        }
    });

    return api;
};

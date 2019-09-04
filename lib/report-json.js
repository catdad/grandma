var _ = require('lodash');
var byline = require('byline');
var through = require('through2');

var stats = require('./stats.js');

var estimate = {
    duration: require('./estimate-duration.js'),
    rate: require('./estimate-rate.js'),
    concurrent: require('./estimate-concurrent.js')
};

var FULL = 'fullTest';

function insertInArray(hash, name, value) {
    if (hash[name]) {
        hash[name].push(value);
    } else {
        hash[name] = [value];
    }
}

function mergeToNumericArray(header, data, name) {
    if (header[name] !== undefined && !_.isArray(header[name])) {
        header[name] = [header[name]];
    }

    if (_.isNumber(data[name])) {
        header[name] = header[name] ?
            header[name].concat([data[name]]) :
            [data[name]];
    }
}

function mergeHeaderJson(header, data) {

    if (!header.epoch) {
        header.epoch = data.epoch;
    }

    if (!header.duration) {
        header.duration = data.duration;
    }

    if (header.epoch !== data.epoch || header.duration !== data.duration) {
        // figure out the earliest epoch and longest possible runtime

        var absStart = Math.min(header.epoch, data.epoch);
        var absEnd = Math.max((header.epoch + header.duration), (data.epoch + data.duration));

        header.epoch = absStart;
        header.duration = absEnd - absStart;
    }

    mergeToNumericArray(header, data, 'rate');
    mergeToNumericArray(header, data, 'concurrent');

    header.targetCount = header.targetCount || 0;
    header.targetCount += data.targetCount;

    header.name = header.name || data.name || null;

    return header;
}

function readJsonLines(stream, onLine, done) {
    var readLines = false;

    stream
    .on('error', done)
    .pipe(byline.createStream())
    .pipe(through(function(line, enc, cb) {

        var jsonLine;

        try {
            jsonLine = JSON.parse(line);
        } catch(e) {
            // skip this line
            return cb();
        }

        readLines = true;

        onLine(jsonLine);

        cb();
    }))
    // remember to flish the stream
    .on('data', _.noop)
    .on('end', function() {
        if (!readLines) {
            return done(new Error('no data provided'));
        }

        done();
    });
}

function jsonStats(data) {
    var reports = data.reports;
    var header = data.header;
    var categories = data.categories;

    function buildSummaryFromReports(subset) {
        var groupedTimes = _.reduce(subset, function(seed, rep) {
            _.forEach(rep, function(val, key) {
                insertInArray(seed, key, val);
            });

            return seed;
        }, {});

        var groupedSortedTimes = _.mapValues(groupedTimes, function(rep) {
            return rep.sort(function(a, b) {
                return a - b;
            });
        });

        return _.mapValues(groupedSortedTimes, function(sortedTimes) {
            var iqr = stats.iqr(sortedTimes);

            return {
                mean: stats.mean(sortedTimes),
                median: iqr.q2,
                '25': iqr.q1,
                '50': stats.percentile(sortedTimes, 50),
                '75': iqr.q3,
                '95': stats.percentile(sortedTimes, 95),
                '99': stats.percentile(sortedTimes, 99),
                min: iqr.min,
                max: iqr.max
            };
        });
    }

    var statsJson = {
        info: {
            count: reports.length,
            targetCount: header.targetCount,
            duration: header.duration,
            rate: header.rate || null,
            concurrent: header.concurrent || null,
            name: header.name || null
        },
        breakdown: data.breakdown
    };

    statsJson.estimates = data.estimates;

    statsJson.latencies = buildSummaryFromReports(reports);

    statsJson.categories = _.reduce(categories.latencies, function(memo, arr, name) {
        var group = {
            info: {
                count: arr.length
            }
        };

        group.latencies = buildSummaryFromReports(arr);

        memo[name] = group;

        return memo;
    }, {});

    statsJson.categories = _.reduce(categories.metrics, function(memo, arr, name) {
        var group = memo[name] || {
            info: {
                count: arr.length
            }
        };

        group.metrics = buildSummaryFromReports(arr);

        memo[name] = group;

        return memo;
    }, statsJson.categories);

    return statsJson;
}

function readJsonStats(input, done) {

    var latencies = [];
    var metrics = [];
    var header = {};
    var breakdown = {
        successes: 0
    };
    var categories = {
        latencies: {},
        metrics: {}
    };

    var estimateRate = estimate.rate();
    var estimateConcurrent = estimate.concurrent();
    var estimateDuration = estimate.duration();

    function onJson(data) {
        estimateRate.include(data);
        estimateConcurrent.include(data);
        estimateDuration.include(data);

        if (data.type === 'header') {
            header = mergeHeaderJson(header, data);
        } else {
            var latencySummary = _.reduce(data.report, function(seed, rep, name) {
                seed[name] = rep.duration;
                return seed;
            }, {});

            latencies.push(latencySummary);

            if (data.metrics && Object.keys(data.metrics).length) {
                metrics.push(data.metrics);
            }

            if (data.categories && data.categories.length) {
                data.categories.forEach(function(name) {
                    insertInArray(categories.latencies, name, latencySummary);

                    if (data.metrics && Object.keys(data.metrics).length) {
                        insertInArray(categories.metrics, name, data.metrics);
                    }
                });
            }

            if (data.report[FULL] && data.report[FULL].status === 'failure') {
                breakdown.failures = breakdown.failures || {};

                var errCode = data.report[FULL].errorCode || 0;
                breakdown.failures[errCode] = breakdown.failures[errCode] || 0;
                breakdown.failures[errCode] += 1;
            } else {
                breakdown.successes += 1;
            }
        }
    }

    function averageValue(value) {
        if (_.isArray(value) && value.length) {
            return stats.mean(value);
        }

        return null;
    }

    readJsonLines(input, onJson, function(err) {
        if (err) {
            return done(err);
        }

        header.rate = averageValue(header.rate);
        header.concurrent = averageValue(header.concurrent);

        var combinedData = {
            header: header,
            reports: latencies,
            categories: categories,
            breakdown: breakdown,
            estimates: {
                rate: estimateRate.result,
                concurrent: estimateConcurrent.result,
                duration: estimateDuration.result
            }
        };

        var jsonSummary = jsonStats(combinedData);

        done(undefined, jsonSummary);
    });
}

module.exports = readJsonStats;
module.exports.readLines = readJsonLines;
module.exports._mergeHeaderJson = mergeHeaderJson;

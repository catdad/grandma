/* jshint node: true */

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
var isGzip = require('is-gzip-stream');
var byline = require('byline');
var table = require('text-table');
var Duration = require('duration-js');

var stats = require('./stats');

function appendTimeUnit(val) {
    return (+val).toFixed(3) + 'ms';
}

function Reporter() {
    
    var times = [];
    var header = {};
    
    function addLine(line) {
        var data = JSON.parse(line);
        
        if (data.type === 'header') {
            header = data;
        } else {
            times.push(data.duration);
        }
    }
    
    function readStream(stream, done) {
        stream = byline(stream);

        stream.on('data', function(line) {
            addLine(line);
        });
        
        stream.on('error', function(err) {
            done(err);
        });
        
        stream.on('end', function() {
            done();
        });
    }
    
    this.read = function (file, done) {
        var filepath = path.resolve('.', file);
        
        // determine if the file is zipped or not
        isGzip(fs.createReadStream(filepath), function(err, isGzipped, stream) {
            if (err) {
                throw err;
            }
            
            if (isGzipped) {
                readStream(stream.pipe(zlib.createUnzip()), done);
            } else {
                readStream(stream, done);
            }
        });
    };
    
    this.jsonStats = function() {
        var sortedTimes = times.sort(function(a, b) { return a - b; });
        
        var statsJson = {
            latencies: {
                mean: stats.mean(sortedTimes),
                '50': stats.percentile(sortedTimes, 50),
                '95': stats.percentile(sortedTimes, 95),
                '99': stats.percentile(sortedTimes, 99),
                min: sortedTimes[0],
                max: sortedTimes[sortedTimes.length - 1]    
            },
            info: {
                count: sortedTimes.length,
                targetCount: header.targetCount,
                duration: header.duration,
                rate: header.rate
            }
        };
        
        return statsJson;
    };
    
    this.textStats = function() {
        var statsJson = this.jsonStats();
        
        var durationStr = 'NaN';
        
        if (_.isNumber(statsJson.info.duration)) {
            durationStr = (new Duration(statsJson.info.duration)).toString();
        }
        
        var str = table([
            [
                'Summary',
                '[duration, rate, total]',
                [
                    durationStr,
                    statsJson.info.rate,
                    statsJson.info.count
                ].join(', ')
            ], [
                'Latencies',
                '[mean, 50, 95, 99, max]',
                [
                    statsJson.latencies.mean,
                    statsJson.latencies['50'],
                    statsJson.latencies['95'],
                    statsJson.latencies['99'],
                    statsJson.latencies.max
                ].map(appendTimeUnit).join(', ')
            ]
        ]);
        
        return str + '\n';
    };
}

function validateOpts(opts) {
    if (!_.isString(opts.glob)) {
        return new Error('no results files defined');
    }
    
    return opts;
}

function report(opts, callback) {
    opts = validateOpts(opts);
    
    if (opts instanceof Error) {
        return async.setImmediate(callback.bind(undefined, opts));
    }
    
    var output = opts.output;
    
    glob(opts.glob, function(err, files) {
        if (err) {
            return callback(err);
        }
        
        var reporter = new Reporter();
        
        async.each(files, reporter.read, function(err) {
            if (err) {
                return callback(err);
            }
            
            output.write(reporter.textStats());
            
            if (output !== process.stdout) {
                output.end();
            }
            
            callback();
        });
    });
}

module.exports = report;

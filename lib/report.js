/* jshint node: true */

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
var byline = require('byline');
var table = require('text-table');

var stats = require('./stats');

function appendTimeUnit(val) {
    return (+val).toPrecision(3) + 'ms';
}

function Reporter() {
    
    var times = [];
    
    function addLine(line) {
        var data = JSON.parse(line);
        
        times.push(data.time);
    }
    
    this.read = function (file, done) {
        var filepath = path.resolve('.', file);
        var stream = byline(fs.createReadStream(filepath, { encoding: 'utf8' }));

        stream.on('data', function(line) {
            addLine(line);
        });
        
        stream.on('error', function(err) {
            done(err);
        });
        
        stream.on('end', function() {
            done();
        });
    };
    
    this.summary = function() {
        var sortedTimes = times.sort();
        
        var statsJson = {
            mean: stats.mean(sortedTimes),
            '50': stats.percentile(sortedTimes, 50),
            '95': stats.percentile(sortedTimes, 95),
            '99': stats.percentile(sortedTimes, 99),
            min: sortedTimes[0],
            max: sortedTimes[sortedTimes.length - 1]
        };
        
        var str = table([[
            'Latencies',
            '[mean, 50, 95, 99, max]',
            [
                statsJson.mean,
                statsJson['50'],
                statsJson['95'],
                statsJson['99'],
                statsJson.max
            ].map(appendTimeUnit).join(', ')
        ]]);
        
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
            
            output.write(reporter.summary());
            
            if (output !== process.stdout) {
                output.end();
            }
            
            callback();
        });
    });
}

module.exports = report;

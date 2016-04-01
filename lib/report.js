/* jshint node: true */

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var util = require('util');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
var isGzip = require('is-gzip-stream');
var byline = require('byline');
var table = require('text-table');
var Duration = require('duration-js');
var through = require('through2');

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
    
    function readStream(stream, onLine, done) {
        stream = byline(stream);

        stream.on('data', function(line) {
            onLine(line);
        });
        
        stream.on('error', function(err) {
            done(err);
        });
        
        stream.on('end', function() {
            done();
        });
    }
    
    function readUtil(file, onLine, done) {
        var filepath = path.resolve('.', file);
        
        // determine if the file is zipped or not
        isGzip(fs.createReadStream(filepath), function(err, isGzipped, stream) {
            if (err) {
                throw err;
            }
            
            if (isGzipped) {
                readStream(stream.pipe(zlib.createUnzip()), onLine, done);
            } else {
                readStream(stream, onLine, done);
            }
        });
    }
    
    function readHelper(files, onFile, callback) {
        async.each(files, onFile, function(err) {
            callback(err);
        });
    }
    
    function readSummary(file, done) {
        readUtil(file, addLine, done);
    }
    
    function lineReader(lineStream) {
        return function readLines(file, done) {
            readUtil(file, function(line) {
                var data = JSON.parse(line);
                lineStream.write(data);
            }, done);
        };    
    }
    
    
    function jsonStats() {
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
    }
    
    function textStats() {
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
    }
    
    this.text = function textReporter(files, output, done) {
        var that = this;
        
        readHelper(files, readSummary, function(err) {
            if (err) {
                return done(err);
            }
            
            output.write(textStats());
            
            if (output !== process.stdout) {
                output.end();
            }
            
            done();
        });
    };
    
    this.json = function jsonReporter(files, output, done) {
        var that = this;
        
        readHelper(files, readSummary, function(err) {
            if (err) {
                return done(err);
            }
            
            var jsonSummary = jsonStats();
            output.write(JSON.stringify(jsonSummary, false, 2));
            
            if (output !== process.stdout) {
                output.end();
            }
            
            done();
        });
    };
    
    this.plot = function plotReporter(files, output, done) {
        var that = this;
        
        fs.readFile(path.resolve(__dirname, '..', 'views', 'plot.html'), 'utf8', function (err, html) {
            if (err) {
                return done(err);
            }
            
            var htmlParts = html.toString().split('{{data}}');
            
            output.write(htmlParts[0]);
            
            var lines = through.obj();
            
            lines.on('data', function(data) {
                if (data.type === 'report') {
                    output.write(util.format(
                        '%s,%s\\n',
                        // x axis
                        // from start time, in seconds
                        (data.start / 1000).toFixed(2),
                        // y axis
                        // duration of test, in milliseconds
                        data.duration.toFixed(2)
                    ));
                }
            });
            
            readHelper(files, lineReader(lines), function(err) {
                output.on('drain', function() {
                    done();
                });
                
                output.write(htmlParts[1]);
                
                if (output !== process.stdout) {
                    output.end();
                }
            });            
        });
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
        
        switch(opts.type) {
            case 'text':
                reporter.text(files, output, callback);
                break;
            case 'json':
                reporter.json(files, output, callback);
                break;
            case 'plot':
                reporter.plot(files, output, callback);
        }
    });
}

module.exports = report;

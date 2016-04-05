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

var FULL = 'fullTest';

function appendTimeUnit(val) {
    return (+val).toFixed(3) + 'ms';
}

function Reporter() {
    
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
        async.map(files, onFile, callback);
    }
    
    function readSummary(file, done) {
        var reports = [];
        var header = {};
        
        readUtil(file, function addLineSummary(line) {
            var data = JSON.parse(line.toString());

            if (data.type === 'header') {
                header = data;
            } else {
                reports.push(_.reduce(data.report, function(seed, rep, name) {
                    seed[name] = rep.duration;
                    return seed;
                }, {}));
            }
        }, function(err) {
            if (err) {
                return done(err);
            }
            
            done(undefined, {
                header: header,
                reports: reports
            });
        });
    }
    
    function lineReader(lineStream) {
        return function readLines(file, done) {
            readUtil(file, function(line) {
                var data = JSON.parse(line);
                lineStream.write(data);
            }, done);
        };    
    }
    
    function jsonStats(data) {
        var reports = data.reports;
        var header = data.header;
        
        var groupedTimes = _.reduce(reports, function(seed, rep) {
            _.forEach(rep, function(val, key) {
                if (seed[key]) {
                    seed[key].push(val);
                } else {
                    seed[key] = [val];
                }
            });
            
            return seed;
        }, {});
            
        var groupedSortedTimes = _.mapValues(groupedTimes, function(rep) {
            return rep.sort(function(a, b) {
                return a - b;
            });
        });
        
        var statsJson = {
            info: {
                count: groupedSortedTimes[FULL].length,
                targetCount: header.targetCount,
                duration: header.duration,
                rate: header.rate
            }
        };
        
        statsJson.latencies = _.mapValues(groupedSortedTimes, function(sortedTimes) {
            return {
                mean: stats.mean(sortedTimes),
                '50': stats.percentile(sortedTimes, 50),
                '95': stats.percentile(sortedTimes, 95),
                '99': stats.percentile(sortedTimes, 99),
                min: sortedTimes[0],
                max: sortedTimes[sortedTimes.length - 1]    
            };
        });

        return statsJson;
    }
    
    function readJsonStats(files, done) {
        readHelper(files, readSummary, function(err, data) {
            if (err) {
                return done(err);
            }
            
            var combinedData = {
                header: data[0].header,
                reports: _.reduce(data, function(seed, eachData) {
                    return seed.concat(eachData.reports);
                }, [])
            };
            
            var jsonSummary = jsonStats(combinedData);
            
            done(undefined, jsonSummary);
        });
    }
    
    function textStats(jsonSummary) {
        var durationStr = 'NaN';
        
        if (_.isNumber(jsonSummary.info.duration)) {
            durationStr = (new Duration(jsonSummary.info.duration)).toString();
        }
        
        var str = '';
        var tableArr = [];
        
        // TODO this table needs to be way prettier
        
        // add headers
        tableArr.push([
            'Summary',
            'duration', 'rate', 'total'
        ]);
        tableArr.push([
            '',
            durationStr,
            jsonSummary.info.rate,
            jsonSummary.info.count
        ]);
        
        // write an empty line
        tableArr.push(['']);
        
        // add latencies header
        tableArr.push([
            'Latencies:', 'mean', '50', '95', '99', 'max'
        ]);
        
        // add latencies for each report
        _.forEach(jsonSummary.latencies, function(latencies, name) {
            tableArr.push([name].concat([
                    latencies.mean,
                    latencies['50'],
                    latencies['95'],
                    latencies['99'],
                    latencies.max
                ].map(appendTimeUnit))
            );
        });
        
        str += table(tableArr);
        
        return str + '\n';
    }
    
    this.text = function textReporter(files, output, done) {
        var that = this;
        
        readJsonStats(files, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            output.write(textStats(jsonSummary));
            
            if (output !== process.stdout) {
                output.end();
            }
            
            done();
        });
    };
    
    this.json = function jsonReporter(files, output, done) {
        var that = this;
        
        readJsonStats(files, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
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
                    
                    // UGH
                    
//                    console.log(data);
//                    var idx = 0;
//                    var len = Object.keys(data.report);
//                    var template = function(len) {
//                        var str = '%s';
//                        _.times(len, function() { str += ',%s' });
//                        str += '\n';
//                        return str;
//                    })(len);
//                    
//                    var format = function(val, first, idx) {
//                        
//                    };
//                    
//                    _.forEach(data.report, function(val, key) {
//                        
//                    });
                    
                    
                    // For now, we will just write the full test report in the plot
                    output.write(util.format(
                        '%s,%s\\n',
                        // x axis
                        // from start time, in seconds
                        (data.report[FULL].start / 1000).toFixed(2),
                        // y axis
                        // duration of test, in milliseconds
                        data.report[FULL].duration.toFixed(2)
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

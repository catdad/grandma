/* jshint node: true */

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var util = require('util');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
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
    
    function readJsonLines(stream, onLine, done) {
        readStream(stream, function eachLine(line) {
            var jsonLine;

            try {
                jsonLine = JSON.parse(line);
            } catch(e) {
                // skip this line
                return;
            }

            onLine(jsonLine);
        }, done);
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
    
    function readJsonStats(input, done) {
        
        var reports = [];
        var header = {};
        
        function onJson(data) {
            if (data.type === 'header') {
                header = data;
            } else {
                reports.push(_.reduce(data.report, function(seed, rep, name) {
                    seed[name] = rep.duration;
                    return seed;
                }, {}));
            }
        }
        
        readJsonLines(input, onJson, function(err) {
            if (err) {
                return done(err);
            }
            
            var combinedData = {
                header: header,
                reports: reports
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
    
    this.text = function textReporter(input, output, done) {
        var that = this;
        
        readJsonStats(input, function(err, jsonSummary) {
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
    
    this.json = function jsonReporter(input, output, done) {
        var that = this;
        
        readJsonStats(input, function(err, jsonSummary) {
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
    
    this.plot = function plotReporter(input, output, done) {
        var that = this;
        
        fs.readFile(path.resolve(__dirname, '..', 'views', 'plot.html'), 'utf8', function (err, html) {
            if (err) {
                return done(err);
            }
            
            var htmlParts = html.toString().split('{{data}}');
            
            output.write(htmlParts[0]);
            
            var template;
            var keys;
            
            function determineTemplate(report) {
                keys = _.difference(_.keys(report), [FULL]);

                template = (function(len) {
                    var str = '%s';
                    _.times(len, function() {
                        str += ',%s';
                    });
                    str += '\\n';
                    return str;
                })(keys.length + 1);
            }
            
            function writeHeaders() {
                var args = [template, 'Start', FULL].concat(keys);
                output.write(util.format.apply(util, args));
            }
            
            function onJson(data) {
                if (data.type === 'report') {
                    
                    if (!template) {
                        determineTemplate(data.report);
                        writeHeaders();
                    }
                    
                    var args = [template];
                    args.push(
                        // x axis
                        // from start time, in seconds,
                        // It might not be great for all custom metrics to have the
                        // same x-axis, but I am going with it for now.
                        (data.report[FULL].start / 1000).toFixed(2)
                    );
                    
                    args.push(
                        // y axis
                        // duration of test, in milliseconds
                        data.report[FULL].duration.toFixed(2)
                    );
                    
                    keys.forEach(function(key) {
                        args.push(data.report[key].duration.toFixed(2));
                    });
                    
                    // For now, we will just write the full test report in the plot
                    output.write(util.format.apply(util, args));
                }
            }
            
            readJsonLines(input, onJson, function(err) {
                
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
    if (!opts.input || !opts.input.pipe || !opts.input.readable) {
        return new Error('no results input stream defined');
    }
    
    return opts;
}

function report(opts, callback) {
    opts = validateOpts(opts);
    
    if (opts instanceof Error) {
        return async.setImmediate(callback.bind(undefined, opts));
    }
    
    var input = opts.input;
    var output = opts.output;

    input.on('error', function(err) {
        callback(err);
    });
    
    var reporter = new Reporter();

    switch(opts.type) {
        case 'text':
            reporter.text(input, output, callback);
            break;
        case 'json':
            reporter.json(input, output, callback);
            break;
        case 'plot':
            reporter.plot(input, output, callback);
    }
}

module.exports = report;

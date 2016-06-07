var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('lodash');
var async = require('async');
var byline = require('byline');
var table = require('text-table');
var Duration = require('duration-js');
var through = require('through2');
var ptBox = require('plain-text-box-plot');

var isStdio = require('./isstdio.js');
var ttyHelper = require('./tty-helper.js');
var stats = require('./stats.js');

var FULL = 'fullTest';

function appendTimeUnit(val) {
    return (+val).toFixed(3) + 'ms';
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
    
    return header;
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
        var readLines = false;
        readStream(stream, function eachLine(line) {
            var jsonLine;

            try {
                jsonLine = JSON.parse(line);
            } catch(e) {
                // skip this line
                return;
            }
            
            readLines = true;

            onLine(jsonLine);
        }, function(err) {
            if (err) {
                return done(err);
            }
            
            if (!readLines) {
                return done(new Error('no data provided'));
            }
            
            done();
        });
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
                rate: header.rate || null,
                concurrent: header.concurrent || null
            },
            breakdown: data.breakdown
        };
        
        statsJson.latencies = _.mapValues(groupedSortedTimes, function(sortedTimes) {
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

        return statsJson;
    }
    
    function readJsonStats(input, done) {
        
        var reports = [];
        var header = {};
        var breakdown = {
            successes: 0
        };
        
        function onJson(data) {
            if (data.type === 'header') {
                header = mergeHeaderJson(header, data);
            } else {
                reports.push(_.reduce(data.report, function(seed, rep, name) {
                    seed[name] = rep.duration;
                    return seed;
                }, {}));
                
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
                reports: reports,
                breakdown: breakdown
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
            'Summary:',
            'duration', 'rate', 'concurrent', 'total'
        ]);
        tableArr.push([
            '',
            durationStr,
            jsonSummary.info.rate || 'null',
            jsonSummary.info.concurrent || 'null',
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
            ].map(appendTimeUnit)));
        });
        
        str += table(tableArr) + '\n';
        
        // add breakdown of successes and failures
        var breakdown = jsonSummary.breakdown;
        var breakdownArr = [];
        
        breakdownArr.push(['Successes:', breakdown.successes]);
        
        var failuresTitle = 'Failure code %s:';
        
        if (breakdown.failures && _.keys(breakdown.failures).length) {
            _.forEach(breakdown.failures, function(count, errCode) {
                breakdownArr.push([
                    util.format(failuresTitle, errCode),
                    count
                ]);
            });
        } else {
            breakdownArr.push(['Failures:', 0]);
        }
        
        str += '\n' + table(breakdownArr);
        
        return str + '\n';
    }
    
    function endStream(stream) {
        if (!isStdio(stream)) {
            stream.end();
        }
    }
    
    this.text = function textReporter(input, output, done) {
        
        readJsonStats(input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            output.write(textStats(jsonSummary));
            
            endStream(output);
            
            done();
        });
    };
    
    this.json = function jsonReporter(input, output, done) {
        
        readJsonStats(input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            output.write(JSON.stringify(jsonSummary, false, 2));
            
            endStream(output);
            
            done(undefined, jsonSummary);
        });
    };
    
    this.box = function boxplotReporter(input, output, done) {
        
        readJsonStats(input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            // Note: for now, we are assuming that we will be
            // writing this data to stdout, and so will determine
            // its width. However, width should probably go in the
            // options somehow.
            
            var width = ttyHelper.width;
            var stats = jsonSummary.latencies.fullTest;
            
            var str = ptBox({
                min: stats.min,
                q1: stats['25'],
                q2: stats.median,
                q3: stats['75'],
                max: stats.max
            }, width);
            
            output.write(str + '\n');
            
            endStream(output);
            
            done();
        });
    };
    
    this.plot = function plotReporter(input, output, done) {
        
        var template;
        var keys;
        var FULL_ERR = FULL + ' Err';
        
        var onFirstWrite = _.noop;

        function determineTemplate(report) {
            keys = _.difference(_.keys(report), [FULL_ERR, FULL]);

            template = (function(len) {
                // "fullTest Err" and "fullTest"
                var str = '%s,%s';
                _.times(len, function() {
                    str += ',%s';
                });
                str += '\\n';
                return str;
            }(keys.length + 1));
        }
        
        function writeHeaders() {
            var args = [template, 'Start', FULL_ERR, FULL].concat(keys);
            output.write(util.format.apply(util, args));
        }
        
        function onReport(data) {
            if (!template) {
                determineTemplate(data.report);
                onFirstWrite();
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

            if (data.report[FULL].status === 'success') {
                args.push(NaN);
                args.push(
                    // y axis
                    // duration of test, in milliseconds
                    data.report[FULL].duration.toFixed(2)
                );
            } else {
                args.push(
                    // y axis
                    // duration of test, in milliseconds
                    data.report[FULL].duration.toFixed(2)
                );
                args.push(NaN);
            }

            keys.forEach(function(key) {
                args.push(data.report[key].duration.toFixed(2));
            });

            // For now, we will just write the full test report in the plot
            output.write(util.format.apply(util, args));
        }
        
        function onJson(data) {
            if (data.type === 'report') {
                onReport(data);
            }
        }
        
        var htmlParts;
        
        async.auto({
            view: function(next) {
                fs.readFile(path.resolve(__dirname, '..', 'views', 'plot.html'), 'utf8', next);
            },
            splitHtml: ['view', function(results, next) {
                var html = results.view;
                
                htmlParts = html.toString().split('{{data}}');
                
                // This is done to prevent writing to the output
                // before we have determined that the input stream
                // contains correct data, in order to match all
                // of the other reporters.
                onFirstWrite = function() {
                    output.write(htmlParts[0]);
                    onFirstWrite = _.noop;
                };

                async.setImmediate(next);
            }],
            inputs: ['splitHtml', function(results, next) {
                var linesStream = through();
                var jsonStream = through();
        
                input.on('data', function(chunk) {
                    linesStream.write(chunk);
                    jsonStream.write(chunk);
                });
                
                input.on('end', function() {
                    linesStream.end();
                    jsonStream.end();
                });
                
                input.on('error', function(err) {
                    linesStream.emit('error', err);
                    jsonStream.emit('error', err);
                });
                
                async.setImmediate(next, undefined, {
                    lineStream: linesStream,
                    jsonStream: jsonStream
                });
            }],
            readLines: ['inputs', function(results, next) {
                readJsonLines(results.inputs.lineStream, onJson, next);
            }],
            readJson: ['inputs', function(results, next) {
                readJsonStats(results.inputs.jsonStream, function(err, jsonStats) {
                    if (err) {
                        return next(err);
                    }
                    
                    var text = textStats(jsonStats);
                    
                    if (htmlParts[1]) {
                        htmlParts[1] = htmlParts[1].replace(/\{\{textStats\}\}/g, text);
                    }
                    
                    next();
                });
            }],
            writeEnd: ['readLines', 'readJson', function(results, next) {
                output.on('drain', function() {
                    next();
                });

                output.write(htmlParts[1]);

                endStream(output);
            }]
        }, function(err) {
            done(err);
        });
    };
}

function validateStream(stream, type, errString) {
    if (!stream || !stream.pipe || (type && !stream[type])) {
        return new Error(errString);
    }
}

function validateOpts(opts) {
    // set the default reporter to json
    if (!opts.type) {
        opts.type = 'json';
    }
    
    // the output stream is optional for the json reporter
    if (opts.type === 'json' && !opts.output) {
        opts.output = through();
    }
    
    return validateStream(opts.input, 'readable', 'no input stream defined') ||
        validateStream(opts.output, 'writable', 'no output stream defined') ||
        opts;
}

function report(opts, callback) {
    opts = validateOpts(opts);
    
    if (opts instanceof Error) {
        return setImmediate(callback, opts);
    }
    
    var input = opts.input;
    var output = opts.output;
    var type = opts.type;

    input.on('error', function(err) {
        callback(err);
    });
    
    var reporter = new Reporter();
    
    if (reporter[type]) {
        return reporter[type](input, output, callback);
    } else {
        return setImmediate(callback, new Error(type + ' is not a valid report type'));
    }
}

module.exports = report;
module.exports._mergeHeaderJson = mergeHeaderJson;

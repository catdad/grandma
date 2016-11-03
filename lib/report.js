var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var async = require('async');
var byline = require('byline');
var through = require('through2');
var ptBox = require('plain-text-box-plot');

var isStream = require('./is-stream.js');
var textReport = require('./report-text.js');
var jsonReport = require('./report-json.js');

var FULL = 'fullTest';

function renderMustaches(text, data) {
    _.forEach(data, function(val, key) {
        var regex = new RegExp('\{\{' + key + '\}\}', 'g');
        text = text.replace(regex, val);
    });
    
    return text;
}

function Reporter(repOpts) {
    
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
    
    function endStream(stream) {
        if (!isStream.stdio(stream)) {
            stream.end();
        }
    }
    
    this.text = function textReporter(opts, done) {
        
        jsonReport(opts.input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            opts.output.write(textReport(jsonSummary, {
                color: opts.color
            }));
            
            endStream(opts.output);
            
            done();
        });
    };
    
    this.json = function jsonReporter(opts, done) {
        
        jsonReport(opts.input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            if (!repOpts.estimates) {
                delete jsonSummary.estimates;
            }
            
            opts.output.write(JSON.stringify(jsonSummary, false, 2));
            
            endStream(opts.output);
            
            done(undefined, jsonSummary);
        });
    };
    
    this.box = function boxplotReporter(opts, done) {
        
        var input = opts.input;
        var output = opts.output;
        
        function boxText(latencies, width) {
            return ptBox({
                min: latencies.min,
                q1: latencies['25'],
                q2: latencies.median,
                q3: latencies['75'],
                max: latencies.max
            }, width);
        }
        
        jsonReport(input, function(err, jsonSummary) {
            if (err) {
                return done(err);
            }
            
            // Note: for now, we are assuming that we will be
            // writing this data to stdout, and so will determine
            // its width. However, width should probably go in the
            // options somehow.
            
            var width = _.get(repOpts, 'box.width') || 75;
            var fullTestStats = jsonSummary.latencies.fullTest;
            
            output.write('Full Test:\n');
            output.write(boxText(fullTestStats, width) + '\n');
            
            _.forEach(jsonSummary.categories, function(val, name) {
                output.write('\nCategory: ' + name + '\n');
                
                output.write(boxText(val.latencies.fullTest, width) + '\n');
            });
            
            endStream(output);
            
            done();
        });
    };
    
    this.plot = function plotReporter(opts, done) {
        
        var REPORT_FILE = 'plot.html';
        
        var input = opts.input;
        var output = opts.output;
        
        var firstWrite = true;
        var FULL_ERR = FULL + '_Err';
        
        var keys = [
            FULL_ERR,
            FULL
        ];
        
        var onFirstWrite = _.noop;

        var render = (function() {
            return function renderAll(data) {
                // let's not modify the original report,
                // just in case
                var clone = _.cloneDeep(data);
                
                // make sure that existing keys always stay in order,
                // and new keys are always added to the end
                var unknown = _.difference(_.keys(clone), keys);
                keys = keys.concat(unknown);
                
                // make sure all known keys are defined, even if they
                // did not originally exist on the report
                keys.forEach(function(key) {
                    clone[key] = clone[key] || {};
                });
                
                return _.template(keys.map(function(key) {
                    return '<%=' + key + '%>';
                }).join(','))(_.mapValues(clone, function(val, key) {
                    return _.isNumber(val.duration) ?
                        val.duration.toFixed(2) :
                        'null';
                }));
            };
        }());
  
        function onReport(data) {
            // we'll put the comma at the beginning, because it
            // is easier to detect the first item than it is
            // the last item we are writing
            var str = ',[';

            if (firstWrite) {
                str = '[';
                onFirstWrite();
                
                firstWrite = false;
            }
            
            // x axis
            // from start time, in seconds,
            // It might not be great for all custom metrics to have the
            // same x-axis, but I am going with it for now.
            str += (data.report[FULL].start / 1000).toFixed(2) + ',';
            
            if (data.report[FULL].status === 'success') {
                data.report[FULL_ERR] = {};
            } else {
                data.report[FULL_ERR] = data.report[FULL];
                data.report[FULL] = {};
            }

            str += render(data.report) + ']';
            
            output.write(str);
        }
        
        function onJson(data) {
            if (data.type === 'report') {
                onReport(data);
            }
        }
        
        var htmlParts;
        
        async.auto({
            view: function(next) {
                fs.readFile(path.resolve(__dirname, '..', 'views', REPORT_FILE), 'utf8', next);
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
                    jsonStream.write(chunk);
                    linesStream.write(chunk);
                });
                
                input.on('end', function() {
                    jsonStream.end();
                    linesStream.end();
                });
                
                input.on('error', function(err) {
                    jsonStream.emit('error', err);
                    linesStream.emit('error', err);
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
                jsonReport(results.inputs.jsonStream, function(err, statsObj) {
                    if (err) {
                        return next(err);
                    }
                    
                    var text = textReport(statsObj, {
                        color: false
                    });
                    
                    if (htmlParts[1]) {
                        
                        htmlParts[1] = renderMustaches(htmlParts[1], {
                            labels: JSON.stringify(['Start'].concat(keys)),
                            testname: statsObj.info.name || 'Test',
                            textStats: text
                        });

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

function validateOpts(opts) {
    // set the default reporter to json
    if (!opts.type) {
        opts.type = 'json';
    }
    
    // the output stream is optional for the json reporter
    if (opts.type === 'json' && !opts.output) {
        opts.output = through();
    }
    
    try {
        isStream.assertStream(opts.input, 'readable', 'no readable input stream defined');
        isStream.assertStream(opts.output, 'writable', 'no writable output stream defined');
    } catch(err) {
        return err;
    }
    
    return opts;
}

function report(opts, callback) {
    opts = validateOpts(opts);
    
    if (opts instanceof Error) {
        return setImmediate(callback, opts);
    }
    
    var type = opts.type;
    opts.color = !!opts.color;

    opts.input.on('error', function(err) {
        callback(err);
    });
    
    var reporter = new Reporter(opts);
    
    if (reporter[type]) {
        return reporter[type](opts, callback);
    } else {
        return setImmediate(callback, new Error(type + ' is not a valid report type'));
    }
}

module.exports = report;
module.exports._mergeHeaderJson = jsonReport._mergeHeaderJson;

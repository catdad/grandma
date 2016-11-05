var fs = require('fs');
var path = require('path');

var async = require('async');
var _ = require('lodash');
var through = require('through2');

var isStream = require('./is-stream.js');
var jsonReport = require('./report-json.js');
var textReport = require('./report-text.js');

function renderMustaches(text, data) {
    _.forEach(data, function(val, key) {
        var regex = new RegExp('\{\{' + key + '\}\}', 'g');
        text = text.replace(regex, val);
    });
    
    return text;
}

function endStream(stream) {
    if (!isStream.stdio(stream)) {
        stream.end();
    }
}

module.exports = function(opts, done) {
    var REPORT_FILE = path.resolve(__dirname, '..', 'views', 'html.html');

    var input = opts.input;
    var output = opts.output;

    var firstWrite = true;

    var onFirstWrite = _.noop;

    function onReport(data) {
        
        var ticks = _.map(data.report, function(metric, name) {
            return {
                // x axis
                // from start time, in seconds,
                // It might not be great for all custom metrics to have the
                // same x-axis, but I am going with it for now.
                x: Number((metric.start / 1000).toFixed(2)),
                y: Number(metric.duration.toFixed(2)),
                name: name,
                categories: [].concat(data.categories)
            };
        });
        
        // stringify and remove the first and last characters (the [] from the array)
        var str = JSON.stringify(ticks).slice(1).slice(0, -1);

        output.write(str);
    }

    function onJson(data) {
        if (data.type === 'report') {
            if (firstWrite) {
                onFirstWrite();

                output.write('[');
                
                firstWrite = false;
            } else {
                output.write(',');
            }
            
            onReport(data);
        }
    }

    var htmlParts;

    async.auto({
        view: function(next) {
            fs.readFile(REPORT_FILE, 'utf8', next);
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

            setImmediate(next, undefined, {
                lineStream: linesStream,
                jsonStream: jsonStream
            });
        }],
        readLines: ['inputs', function(results, next) {
            jsonReport.readLines(results.inputs.lineStream, onJson, function(err) {
                if (err) {
                    return next(err);
                }
                
                output.write(']');
                next();
            });
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
                        testname: statsObj.info.name || 'Test',
                        textStats: text.trim()
                    });

                }

                next();
            });
        }],
        writeEnd: ['readLines', 'readJson', function(results, next) {
            if (!output.write(htmlParts[1])) {
                output.once('drain', function() {
                    next();
                });
            } else {
                setImmediate(next);
            }
        }],
        endStream: ['writeEnd', function(results, next) {
            endStream(output, next);
        }]
    }, done);
};

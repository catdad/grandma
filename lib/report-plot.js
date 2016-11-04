var fs = require('fs');
var path = require('path');

var async = require('async');
var _ = require('lodash');
var through = require('through2');

var isStream = require('./is-stream.js');
var jsonReport = require('./report-json.js');
var textReport = require('./report-text.js');

var FULL = 'fullTest';

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

            setImmediate(next, undefined, {
                lineStream: linesStream,
                jsonStream: jsonStream
            });
        }],
        readLines: ['inputs', function(results, next) {
            jsonReport.readLines(results.inputs.lineStream, onJson, next);
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
                        textStats: text.trim()
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

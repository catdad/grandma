var path = require('path');

var async = require('async');
var _ = require('lodash');
var through = require('through2');

var vfs = require('vinyl-fs');
var include = require('gulp-include');
var readFs = require('read-vinyl-file-stream');

var isStream = require('./is-stream.js');
var jsonReport = require('./report-json.js');
var textReport = require('./report-text.js');
var constants = require('./constants.js');

function renderMustaches(text, data) {
    _.forEach(data, function(val, key) {
        var regex = new RegExp('\{\{' + key + '\}\}', 'g');
        text = text.replace(regex, _.escape(val));
    });

    return text;
}

function endStream(stream, cb) {
    if (isStream.stdio(stream)) {
        setImmediate(cb);
        return;
    }

    stream.on('end', cb);
    stream.end();
}

function serializeReport(data, id) {
    var ticks = _.map(data.report, function(metric, name) {

        if (name === constants.TEST_FULL && metric.status === constants.STATE_ERR) {
            name = constants.TEST_FULL_ERR;
        }

        return {
            // x-axis is seconds from the start of the test run
            // It might not be great for all custom metrics to have the
            // same x-axis, but I am going with it for now.
            x: Number((metric.start / 1000).toFixed(2)),
            // y-axis is in milliseconds
            y: Number(metric.duration.toFixed(2)),
            name: name,
            categories: [].concat(data.categories),
            id: id
        };
    });

    // stringify and remove the first and last characters (the [] from the array)
    return JSON.stringify(ticks).slice(1).slice(0, -1);
}

module.exports = function(opts, done) {
    var REPORT_FILE = path.resolve(__dirname, '..', 'views', 'html-report', 'html.html');

    var input = opts.input;
    var output = opts.output;

    var firstWrite = true;

    var reportCount = 0;
    var onFirstWrite = _.noop;

    function onJson(data) {
        if (data.type === 'report') {
            if (firstWrite) {
                onFirstWrite();

                output.write('[');

                firstWrite = false;
            } else {
                output.write(',');
            }

            output.write(serializeReport(data, reportCount));

            reportCount += 1;
        }
    }

    async.auto({
        build: function(next) {
            var buildFile;

            vfs.src(REPORT_FILE)
                .pipe(include())
                .on('error', next)
                .pipe(readFs(function onFile() {
                    // stupid eslint rule not letting me have
                    // 4 arguments... actually, it a good rule,
                    // but still
                    var content = arguments[0];
                    var file = arguments[1];
                    var cb = arguments[3];

                    if (file.path === REPORT_FILE) {
                        buildFile = content;
                    }

                    cb();
                }, function flush(stream, cb) {
                    if (buildFile) {
                        setImmediate(next, null, buildFile);
                    } else {
                        setImmediate(next, new Error('building the view failed'));
                    }

                    cb();
                }))
                .on('data', _.noop);
        },
        view: ['build', function(results, next) {
            var htmlParts = results.build.toString().split('{{data}}');

            // This is done to prevent writing to the output
            // before we have determined that the input stream
            // contains correct data, in order to match all
            // of the other reporters.
            onFirstWrite = function() {
                output.write(htmlParts[0]);
                onFirstWrite = _.noop;
            };

            setImmediate(next, null, htmlParts);
        }],
        inputs: ['view', function(results, next) {
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
        readJson: ['view', 'inputs', function(results, next) {
            jsonReport(results.inputs.jsonStream, function(err, statsObj) {
                if (err) {
                    return next(err);
                }

                var text = textReport(statsObj, {
                    color: false
                });

                if (results.view[1]) {

                    results.view[1] = renderMustaches(results.view[1], {
                        testname: statsObj.info.name || 'Test',
                        textStats: text.trim(),
                        metadata: opts.metadata ? opts.metadata.toString().trim() : ''
                    });

                }

                next();
            });
        }],
        writeEnd: ['readLines', 'readJson', function(results, next) {
            if (!output.write(results.view[1])) {
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

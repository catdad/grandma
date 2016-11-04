
var _ = require('lodash');
var through = require('through2');
var ptBox = require('plain-text-box-plot');

var isStream = require('./is-stream.js');
var textReport = require('./report-text.js');
var jsonReport = require('./report-json.js');
var plotReport = require('./report-plot.js');

function Reporter(repOpts) {
    
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
        plotReport(opts, done);
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
    callback = _.once(callback);
    
    if (opts instanceof Error) {
        return setImmediate(callback, opts);
    }
    
    var type = opts.type;
    opts.color = !!opts.color;

    // handle errors here, in case individual
    // reporters do not handle errors
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

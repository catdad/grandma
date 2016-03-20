/* jshint node: true */

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var async = require('async');
var glob = require('glob');
var byline = require('byline');

function Reporter() {
    var count = 0;
    var totalTime = 0;
    
    function addLine(line) {
        var data = JSON.parse(line);
        count += 1;
        totalTime += data.time;
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
        return (totalTime / count).toString();
    };
}

function validateOpts(opts) {
    if (!_.isString(opts.glob)) {
        return new Error('no results files defined');
    }
    
    return opts;
}

function getDestinationStream(opts) {
    var output = process.stdout;
    
    if (_.isString(opts.out) && opts.out !== 'stdout') {
        output = fs.createWriteStream(path.resolve('.', opts.out));
    }
    
    return output;
}

function report(opts, callback) {
    opts = validateOpts(opts);
    
    if (opts instanceof Error) {
        return async.setImmediate(callback.bind(undefined, opts));
    }
    
    var output = getDestinationStream(opts);
    
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

var _ = require('lodash');
var async = require('async');

var isStream = require('./is-stream.js');
var report = require('./report.js');

function assertStreams(streams) {
    if (!_.every(streams, isStream.readable)) {
        throw new TypeError('streams is not an array of readable streams');
    }
    
    if (streams.length < 2) {
        throw new Error('at least two streams are required for a diff');
    }
}

function assertOptions(options) {
    if (!isStream.writable(options.output)) {
        throw new TypeError('options.output is not a writable stream');
    }
}

function assertCallback(callback) {
    if (typeof callback !== 'function') {
        throw new TypeError('callback is not a function');
    }
}

module.exports = function(streams, options, callback) {
    assertStreams(streams);
    assertOptions(options);
    assertCallback(callback);
    
    async.map(streams, function (stream, next) {
        report({
            input: stream,
            type: 'json'
        }, next);
    }, function (err, stats) {
        if (err) {
            return callback(err);
        }
        
        console.log(stats);
        
        callback();
    });
};

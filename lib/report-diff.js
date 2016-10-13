var _ = require('lodash');
var async = require('async');
var table = require('text-table');

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

function appendTimeUnit(val) {
    return (+val).toFixed(3) + 'ms';
}

function statsArr(name, latencies) {
    return [name].concat([
        latencies.mean,
        latencies['50'],
        latencies['95'],
        latencies['99'],
        latencies.max
    ].map(appendTimeUnit));
}

function diffValue(from, to) {
    var str = '';
    str += appendTimeUnit(to);
    str += ' (';
    
    var diff = to - from;
    
    if (diff < 0) {
        str += parseInt(diff / from * 100, 10);
    } else {
        str += '-' + Math.round(diff / from * 100);
    }
    
    str += '%)';
    
    return str;
}

function statsDiffArr(name, from, to) {
    return [name].concat([
        diffValue(from.mean, to.mean),
        diffValue(from['50'], to['50']),
        diffValue(from['95'], to['95']),
        diffValue(from['99'], to['99']),
        diffValue(from.max, to.max)
    ]);
}

module.exports = function(streams, options, callback) {
    assertStreams(streams);
    assertOptions(options);
    assertCallback(callback);
    
    var output = options.output;
    
    async.map(streams, function(stream, next) {
        report({
            input: stream,
            type: 'json'
        }, next);
    }, function(err, stats) {
        if (err) {
            return callback(err);
        }
        
        var fastest = stats.reduce(function(a, b) {
            if (a.latencies.fullTest.mean < b.latencies.fullTest.mean) {
                return a;
            }
            
            return b;
        });
        
        var tableArr = [];
        
        // add latencies header
        tableArr.push([
            'Latencies:', 'mean', '50', '95', '99', 'max'
        ]);
        
        stats.forEach(function(stat) {
            _.forEach(stat.latencies, function(val, name) {
                if (stat === fastest) {
                    tableArr.push(statsArr(name, val));
                } else {
                    tableArr.push(statsDiffArr(name, fastest.latencies[name], val));
                }
            });
        });
        
        var tableStr = table(tableArr);
        
        output.write(tableStr + '\n');
        
        if (!isStream.stdio(output)) {
            output.end();
        }
        
        callback();
    });
};

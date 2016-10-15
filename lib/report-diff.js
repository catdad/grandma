var util = require('util');

var _ = require('lodash');
var async = require('async');
var table = require('text-table');
var chalk = require('chalk');
var unstyle = require('unstyle');
var Duration = require('duration-js');

var isStream = require('./is-stream.js');
var report = require('./report.js');

function assertStreams(streams) {
    if (!_.every(streams, isStream.readable)) {
        throw new TypeError('streams is not an array or has object of readable streams');
    }
    
    if (_.keys(streams).length < 2) {
        throw new Error('at least two streams are required for a diff');
    }
}

function assertOptions(options) {
    if (!isStream.writable(options.output)) {
        throw new TypeError('options.output is not a writable stream');
    }
}

function duration(val) {
    return (new Duration(val)).toString();
}

var stringifier = function(opts) {
    function appendTimeUnit(val) {
        return (+val).toFixed(3) + 'ms';
    }

    function statsArr(name, latencies, color) {
        return [name].concat([
            latencies.mean,
            latencies['50'],
            latencies['95'],
            latencies['99'],
            latencies.max
        ].map(appendTimeUnit)).map(function(s) {
            if (opts.color) {
                return color(s);
            }
            
            return s;
        });
    }

    function percentString(from, to) {
        var diff = to - from;
        var template = '(%s\%)';
        
        var str;
        var color;
        
        if (diff < 0) {
            str = util.format(template, Math.round(Math.abs(diff) / from * 100, 10));
            color = chalk.green;
        } else {
            str = util.format(template, '-' + Math.round(diff / from * 100));
            color = chalk.red;
        }
        
        if (opts.color) {
            str = color(str);
        }
        
        return str;
    }
    
    function diffValue(from, to) {
        var str = '';
        str += appendTimeUnit(to);
        str += ' ' + percentString(from, to);
        
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
    
    function reportName(name, stats) {
        var str = util.format(
            '%s: %s, %s, %s, %s total',
            name,
            stats.info.name,
            duration(stats.info.duration),
            stats.info.rate ?
                stats.info.rate + ' per second' :
                stats.info.concurrent + ' concurrent',
            stats.info.count
        );
        
        if (opts.color) {
            str = chalk.magenta(str);
        }
        
        return str;
    }
    
    return {
        statsMainArr: function() {
            return statsArr.apply(null, [].slice.call(arguments).concat(chalk.cyan));
        },
        statsFadedArr: function() {
            return statsArr.apply(null, [].slice.call(arguments).concat(chalk.gray));
        },
        statsDiffArr: statsDiffArr,
        reportName: reportName
    };
};

module.exports = function(streams, options, callback) {
    try {
        assertStreams(streams);
        assertOptions(options);
    } catch(e) {
        setImmediate(callback, e);
        
        return;
    }
    
    var output = options.output;
    var stringify = stringifier(options);
    
    async.mapValues(streams, function(stream, name, next) {
        report({
            input: stream,
            type: 'json'
        }, next);
    }, function(err, stats) {
        if (err) {
            return callback(err);
        }
        
        var fastest = _.reduce(stats, function(a, b) {
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
        
        var titleStrings = [];
        
        _.forEach(stats, function(stat, key) {
            // push an empty line before each summary
            tableArr.push(['']);
            
            var title = stringify.reportName(key, stat);
            titleStrings.push(title);
            tableArr.push([title]);
            
            _.forEach(stat.latencies, function(val, name) {
                if (stat === fastest) {
                    tableArr.push(stringify.statsMainArr(name, val));
                } else if (fastest.latencies[name]) {
                    tableArr.push(stringify.statsDiffArr(name, fastest.latencies[name], val));
                } else {
                    tableArr.push(stringify.statsFadedArr(name, val));
                }
            });
        });
        
        var tableStr = table(tableArr, {
            stringLength: function(str) {
                if (_.includes(titleStrings, str)) {
                    return 0;
                }
                
                return unstyle.string(str).length;
            }
        });
        
        output.write(tableStr + '\n');
        
        if (!isStream.stdio(output)) {
            output.end();
        }
        
        callback();
    });
};

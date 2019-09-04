var util = require('util');

var _ = require('lodash');
var Duration = require('duration-js');
var chalk = require('chalk');
var table = require('fancy-text-table');

var serializer = require('./report-serializer.js');

var stringifier = function(opts) {
    function colorString(str, color) {
        if (opts.color) {
            return chalk[color](str);
        }

        return str;
    }

    function colorArray(arr, color) {
        return arr.map(function(str) {
            return colorString(str, color);
        });
    }

    return {
        headers: function(arr) {
            return colorArray(arr, 'cyan');
        },
        title: function(str) {
            return colorString(str, 'magenta');
        },
        latencyList: function(list, tableObj) {
            _.forEach(list, function(latencies, name) {
                tableObj.row(serializer.textArr.latencies(latencies, name));
            });
        },
        metricsList: function(list, tableObj) {
            _.forEach(list, function(metrics, name) {
                tableObj.row(serializer.textArr.metrics(metrics, name).map(function(str) {
                    return colorString(str, 'gray');
                }));
            });
        }
    };
};

function breakdowns(breakdown) {
    var breakdownObj = table();

    breakdownObj.row(['Successes:', breakdown.successes]);

    var failuresTitle = 'Failure code %s:';

    if (breakdown.failures && _.keys(breakdown.failures).length) {
        _.forEach(breakdown.failures, function(count, errCode) {
            breakdownObj.row([
                util.format(failuresTitle, errCode),
                count
            ]);
        });
    } else {
        breakdownObj.row(['Failures:', 0]);
    }

    return breakdownObj.render();
}

module.exports = function(jsonSummary, opts) {
    var durationStr = 'NaN';

    var stringify = stringifier(_.isPlainObject(opts) ? opts : {});

    if (_.isNumber(jsonSummary.info.duration)) {
        durationStr = (new Duration(jsonSummary.info.duration)).toString();
    }

    var tableObj = table();

    // add headers
    tableObj.row(stringify.headers(['Summary:', 'duration', 'rate', 'concurrent', 'total']));
    tableObj.row([
        '',
        durationStr,
        jsonSummary.info.rate || 'null',
        jsonSummary.info.concurrent || 'null',
        jsonSummary.info.count
    ]);

    // write an empty line
    tableObj.line();

    // add latencies header
    tableObj.row(stringify.headers(serializer.textArr.latenciesTitle('Latencies')));

    // add latencies for each report
    stringify.latencyList(jsonSummary.latencies, tableObj);
    stringify.metricsList(jsonSummary.metrics, tableObj);

    if (jsonSummary.categories && Object.keys(jsonSummary.categories).length) {
        // we have categories, let's log those too

        _.forEach(jsonSummary.categories, function(category, categoryName) {
            tableObj.line();
            tableObj.title(stringify.title('Category: ' + categoryName));

            stringify.latencyList(category.latencies, tableObj);
            stringify.metricsList(category.metrics, tableObj);
        });
    }

    return util.format(
        '%s\n\n%s\n',
        tableObj.render(),
        breakdowns(jsonSummary.breakdown)
    );
};

var util = require('util');

var _ = require('lodash');
var Duration = require('duration-js');

var table = require('./text-table.js');
var serializer = require('./report-serializer.js');

module.exports = function(jsonSummary) {
    var durationStr = 'NaN';

    if (_.isNumber(jsonSummary.info.duration)) {
        durationStr = (new Duration(jsonSummary.info.duration)).toString();
    }

    var str = '';
    var tableObj = table();

    // add headers
    tableObj.row([
        'Summary:',
        'duration', 'rate', 'concurrent', 'total'
    ]);
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
    tableObj.row(serializer.textArr.latenciesTitle('Latencies'));

    // add latencies for each report
    _.forEach(jsonSummary.latencies, function(latencies, name) {
        tableObj.row(serializer.textArr.latencies(latencies, name));
    });

    if (jsonSummary.categories && Object.keys(jsonSummary.categories).length) {
        // we have categories, let's log those too

        _.forEach(jsonSummary.categories, function(category, categoryName) {
            tableObj.line();
            tableObj.title('Category: ' + categoryName);

            _.forEach(category.latencies, function(latencies, name) {
                tableObj.row(serializer.textArr.latencies(latencies, name));
            });
        });
    }

    str += tableObj.render() + '\n';

    // add breakdown of successes and failures
    var breakdown = jsonSummary.breakdown;
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

    str += '\n' + breakdownObj.render();

    return str + '\n';
};

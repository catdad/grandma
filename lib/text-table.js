var table = require('text-table');
var _ = require('lodash');
var unstyle = require('unstyle');

module.exports = function() {
    var titles = [];
    var rows = [];
    
    return {
        row: function(values) {
            rows.push(values);
        },
        title: function(value) {
            titles.push(value);
            rows.push([value]);
        },
        line: function() {
            rows.push(['']);
        },
        render: function() {
            return table(rows, {
                stringLength: function(str) {
                    if (_.includes(titles, str)) {
                        return 0;
                    }

                    return unstyle.string(str).length;
                }
            });
        }
    };
};

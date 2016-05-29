/* jshint node: true */

var _ = require('lodash');

function Enumerable(enums) {
    var enumeration = _.reduce(enums, function(seed, val, key) {
        seed[key] = val;
        return seed;
    }, {});
    
    var fromValue = function(value) {
        var matches = Object.keys(enumeration).filter(function(x) {
            return enumeration.hasOwnProperty(x) && (enumeration[x] === value);
        });
        
        if (matches.length === 1) {
            return matches[0];
        }
        
        return undefined;
    };
    
    Object.defineProperty(enumeration, 'fromValue', {
        enumerable: false,
        value: fromValue
    });
    
    return enumeration;
}

Enumerable.message = Enumerable({
    ready: 1,
    tick: 2
});

module.exports = Enumerable;

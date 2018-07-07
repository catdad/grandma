var _ = require('lodash');

function reduceThreadSafe(obj, allowData) {
    return _.reduce(obj, function(seed, val, key) {
        if (allowData === true && key === 'data' && _.isPlainObject(val)) {
            seed.data = reduceThreadSafe(val, false);
        } else if (_.isString(val) || _.isNumber(val)) {
            seed[key] = val;
        }

        return seed;
    }, {});
}

module.exports = {
    reduceThreadSafe: reduceThreadSafe
};

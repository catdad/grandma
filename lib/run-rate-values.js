var Fraction = require('fractional').Fraction;

function calculateRunValues(rate) {
    var f = new Fraction(rate, 1000);

    return {
        rate: rate,
        // every x milliseconds
        intTime: f.denominator,
        // start y amount of tasks
        concurrent: f.numerator
    };
}

module.exports = calculateRunValues;

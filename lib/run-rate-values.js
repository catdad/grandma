var Fraction = require('fractional').Fraction;

var DELTA_LIMIT = 0.1;

// Do a really rough simplification, making sure
// that we stay above the requested rate. In almost
// all cases, this is good enough.
function reduce(fraction) {
    return new Fraction(
        Math.ceil(fraction.numerator / 2),
        Math.floor(fraction.denominator / 2)
    );
}

// For the rest of the cases, we will slowly
// make the function smaller by dividing the
// numerator by an increasing denominator.
function smaller(fraction) {
    return new Fraction(fraction.numerator, fraction.denominator + 1);
}

function calcReal(fraction) {
    return (fraction.numerator / fraction.denominator * 1000);
}

function calculateRunValues(rate) {
    var f = new Fraction(rate, 1000);
    
    // Reduce the fraction by making it slightly larger.
    while (f.denominator > 250 && f.numerator > 1) {
        f = reduce(f);
    }
    
    var realRate = calcReal(f);
    var delta = Math.abs(realRate - rate);
    
    // Bring the fraction back down until the difference
    // in rate is below the limit.
    while (realRate > rate && delta > DELTA_LIMIT) {
        f = smaller(f);
        realRate = calcReal(f);
        delta = Math.abs(realRate - rate);
    }
    
    return {
        rate: rate,
        realRate: realRate,
        // start x amount of tasks
        concurrent: f.numerator,
        // every y milliseconds
        intTime: f.denominator
    };
}

module.exports = calculateRunValues;

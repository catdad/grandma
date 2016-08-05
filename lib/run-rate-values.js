var Fraction = require('fractional').Fraction;

function simplify(fraction) {
    // Do a really rough simplification, making sure
    // that we stay above the requested rate. In almost
    // all cases, this is good enough.
    return new Fraction(
        Math.ceil(fraction.numerator / 2),
        Math.floor(fraction.denominator / 2)
    );
}

function calculateRunValues(rate) {
    var f = new Fraction(rate, 1000);
    
    while (f.denominator > 250 && f.numerator > 1) {
        f = simplify(f);
    }
    
    var realRate = (f.numerator / f.denominator * 1000);
    
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

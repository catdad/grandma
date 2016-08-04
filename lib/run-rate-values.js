var Fraction = require('fractional').Fraction;

function rateOfOne() {
    return new Fraction(1, 1000);
}

function perSecond(rate) {
    return new Fraction(rate, 1000);
}

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
    var f;
    
    if (rate < 1) {
        // we won't bother with anything less than 1 per second
        f = rateOfOne();
    } else {
        f = perSecond(rate);
    }
    
    while (f.denominator > 500 && f.numerator > 1) {
        f = simplify(f);
    }
    
    return {
        rate: rate,
        realRate: (f.numerator / f.denominator * 1000),
        // start x amount of tasks
        concurrent: f.numerator,
        // every y milliseconds
        intTime: f.denominator
    };
}

module.exports = calculateRunValues;

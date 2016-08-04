/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks, max-params */

var expect = require('chai').expect;

var rrv = require('../lib/run-rate-values.js');

describe('[run-rate-values]', function() {
    it('returns "rate", "intTime", and "concurrent" values', function() {
        expect(rrv(1)).to.have.all.keys([
            'rate', 'intTime', 'concurrent'
        ]);
    });
});

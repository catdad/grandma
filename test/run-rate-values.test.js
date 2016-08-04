/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks, max-params */

var expect = require('chai').expect;
var _ = require('lodash');

var rrv = require('../lib/run-rate-values.js');

describe('[run-rate-values]', function() {
    it('returns an object with the expected properties', function() {
        expect(rrv(1)).to.have.all.keys([
            'rate', 'intTime', 'concurrent', 'realRate'
        ]);
    });
    
    _.map(new Array(20), function(val, idx) {
        return (61 + (idx * 2)) / 60;
    }).forEach(function(val) {
        it('estimates a close-enough rate for small value: ' + val, function() {
            var estimate = rrv(val);
            expect(Math.abs(estimate.realRate - val)).to.be.below(1);
        });
    });
    
    it('returns a rate of 1 per second for a value less than 1', function() {
        var estimate = rrv(.5);
        expect(estimate.realRate).to.equal(1);
    });
});

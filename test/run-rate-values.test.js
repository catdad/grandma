/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks, max-params */

var expect = require('chai').expect;
var _ = require('lodash');

var rrv = require('../lib/run-rate-values.js');

var DELTA_LIMIT = 0.1;

describe('[run-rate-values]', function() {
    it('returns an object with the expected properties', function() {
        expect(rrv(1)).to.have.all.keys([
            'rate', 'intTime', 'concurrent', 'realRate'
        ]);
    });

    function expectAdjustment(rate, estimate) {
        if (estimate.realRate > rate) {
            // for small decimals, the rate will always be
            // larger
            expect(Math.abs(estimate.realRate - rate)).to.be.below(DELTA_LIMIT);
        } else if (estimate.realRate < rate) {
            // for larger numbers, we might dip a bit below
            // in which case, we will use a bit more
            // wiggle room
            var percent = Math.abs(estimate.realRate - rate) / rate;
            expect(percent).to.be.below(0.05);
        }
    }

    function estimateTest(description) {
        return function(val) {
            it(description + ': ' + val, function() {
                var estimate = rrv(val);
                expectAdjustment(val, estimate);
            });
        };
    }

    _.map(new Array(20), function(val, idx) {
        return (61 + (idx * 2)) / 60;
    }).concat([2.56, 3.14]).forEach(estimateTest('estimates a close-enough rate for small value'));

    _.map(new Array(10), function(val, idx) {
        return (idx + 1) * 9 / 99;
    }).forEach(estimateTest('estimates a decimal less than 1 of value'));

    _.map(new Array(30), function(val, idx) {
        return (idx + 1) * 9 / 10;
    }).forEach(estimateTest('estimates larger decimal of value'));

    _.map(new Array(20), function(val, idx) {
        return (idx + 1) * 3917;
    }).forEach(estimateTest('estimates very large irregular number of value'));
});

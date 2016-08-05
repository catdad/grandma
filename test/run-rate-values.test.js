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
    }).concat([2.56, 3.14]).forEach(function(val) {
        it('estimates a close-enough rate for small value: ' + val, function() {
            var estimate = rrv(val);
            expect(Math.abs(estimate.realRate - val)).to.be.below(1);
        });
    });
    
//    _.map(new Array(10), function(val, idx) {
//        return (idx + 1) * 9 / 99;
//    }).forEach(function(val) {
//        it('estimates decimals less than 1 of value: ' + val, function() {
//            var estimate = rrv(val);
//            console.log(val, estimate);
//
//            expect(Math.abs(estimate.realRate - val)).to.be.below(1);
//        });
//    });
//
//    _.map(new Array(10), function(val, idx) {
//        return (idx + 1) * 9 / 10;
//    }).forEach(function(val) {
//        it('estimates larger decimals of value: ' + val, function() {
//            var estimate = rrv(val);
//            console.log(val, estimate);
//
//            expect(Math.abs(estimate.realRate - val)).to.be.below(1);
//        });
//    });
});

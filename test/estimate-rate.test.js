/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var expect = require('chai').expect;
var _ = require('lodash');

var estimate = require('../lib/estimate-rate.js');

describe('[estimate-rate]', function() {
    function record(start, end) {
        return {
            report: {
                fullTest: {
                    start: start,
                    end: end
                }
            }
        };
    }
    
    it('is a method returning an object', function() {
        expect(estimate).to.be.a('function');
        expect(estimate()).to.be.an('object');
    });
    
    it('exposed an include method', function() {
        expect(estimate()).to.have.property('include')
            .and.to.be.a('function');
    });
    
    it('exposes a read-only result number', function() {
        expect(estimate()).to.have.property('result')
            .and.to.be.a('number')
            .and.to.equal(0);
        
        // test that it cannot be set
        var inst = estimate();
        expect(inst.result).to.equal(0);
        inst.result = 5;
        expect(inst.result).to.equal(0);
    });
    
    it('takes grandma log records and adds them to the duration', function() {
        var inst = estimate();
        
        inst.include(record(0, 100));
        inst.include(record(20, 140));
        
        expect(inst.result).to.equal(2 / (140 / 1000));
    });
    
    it('can take a large amount of data', function() {
        var C = 10;
        var inst = estimate();
        
        _.times(C, function(i) {
            inst.include(record(0, i + 1));
        });
        
        expect(inst.result).to.equal(C / (C / 1000));
    });
    
    it('rejects data that is not a log record', function() {
        var inst = estimate();
        
        inst.include({ some: 'object' });
        
        expect(inst.result).to.equal(0);
    });
    
    it('include returns the estimation instance', function() {
        var inst = estimate();
        
        // both cases should return the instance
        expect(inst.include({ some: 'object' })).to.equal(inst);
        expect(inst.include(record(1, 2))).to.equal(inst);
    });
});

/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var expect = require('chai').expect;

var estimate = require('../lib/estimate-concurrent.js');
var record = require('./_fixtures/record.js');

describe('[estimate-concurrent]', function() {
    
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
    
    it('takes grandma log records and adds them to the concurrency', function() {
        var inst = estimate();
        
        inst.include(record(0, 1000));
        
        expect(inst.result).to.equal(1);
    });
    
    it('can calculate overlapping values', function() {
        var inst = estimate();
        
        inst.include(record(0, 1000));
        inst.include(record(500, 1500));
        inst.include(record(1000, 2000));
        
        expect(inst.result).to.equal(1.5);
    });
    
    it('can calculate results that have small bins', function() {
        var inst = estimate();
        
        inst.include(record(0, 10));
        inst.include(record(5, 15));
        inst.include(record(10, 20));
        
        // this result is not totally accurate, but this
        // is an estimation after all
        expect(inst.result).to.equal(3);
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

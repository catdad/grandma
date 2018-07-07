/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var expect = require('chai').expect;

var estimate = require('../lib/estimate-duration.js');
var record = require('./_fixtures/record.js');

describe('[estimate-duration]', function() {

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

        expect(inst.result).to.equal(140);
    });

    it('works if the data is out of order', function() {
        var inst = estimate();

        inst.include(record(20, 140));
        inst.include(record(0, 100));

        expect(inst.result).to.equal(140);
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

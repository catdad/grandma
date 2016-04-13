/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var stats = require('../lib/stats.js');

describe('[stats]', function() {
    it('has all expected keys', function() {
        expect(stats).to.have.all.keys(['mean', 'median', 'percentile']);
    });
    
    describe('#mean', function() {
        it('calculated averages', function() {
            expect(stats.mean([1, 2, 3])).to.equal(2);
        });
        
        [
            null,
            1,
            {},
            function() {}
        ].forEach(function(val) {
            it('throws if given "' + (JSON.stringify(val) || val.toString()) + '"', function() {
                this.skip();
            });
        });
    });
    
    describe('#median', function() {});
    describe('#percentile', function() {});
});

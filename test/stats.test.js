/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var expect = require('chai').expect;
var stats = require('../lib/stats.js');

describe('[stats]', function() {
    it('has all expected keys', function() {
        expect(stats).to.have.all.keys([
            'mean',
            'median',
            'percentile',
            'iqr'
        ]);
    });
    
    function stringify(val) {
        return JSON.stringify(val) || val.toString();
    }
    
    function validationTests(func) {
        [
            null,
            1,
            {},
            function() {}
        ].forEach(function(val) {
            it('throws if given invalid data value: ' + stringify(val), function() {
                function guilty() {
                    func(val);
                }
                
                expect(guilty).to.throw('data is not an array');
            });
        });
        
        it('throws if given an array with non-number values', function() {
            function guilty() {
                func([1, 'r', 3]);
            }

            expect(guilty).to.throw('data[1] is not a number');
        });
    }
    
    describe('#mean', function() {
        it('calculated averages', function() {
            expect(stats.mean([1, 2, 3])).to.equal(2);
        });
        
        validationTests(stats.mean);
    });
    
    describe('#median', function() {
        it('returns a number', function() {
            expect(stats.median([2])).to.be.a('number');
        });
        
        it('calculates the median of an even number of items', function() {
            expect(stats.median([0, 2, 3, 4])).to.equal(2.5);
        });
        it('calculates the median of an odd number of items', function() {
            expect(stats.median([1, 8, 12])).to.equal(8);
        });
        
        validationTests(stats.median);
    });
    
    describe('#percentile', function() {
        var data = [1, 3, 4, 5, 7, 9, 11, 13, 14, 15, 17, 22, 25, 26, 27, 29, 30];
        
        it('returns a number', function() {
            expect(stats.percentile([2], 50)).to.be.a('number');
        });
        
        [
            // ground-truthed data
            [0, 1],
            [1, 1],
            [10, 3],
            [50, 14],
            [90, 29],
            [99, 30],
            [100, 30]
        ].forEach(function(n) {
            it('calculates the nth percentile, where n is ' + n[0], function() {
                expect(stats.percentile(data, n[0])).to.be.a('number').and.to.equal(n[1]);
            });
        });
        
        validationTests(function(val) {
            stats.percentile(val, 50);
        });
        
        function validateInvalidN(n, error) {
            function guilty() {
                stats.percentile(data, n);
            }

            expect(guilty).to.throw(error);
        }
        
        [-1, 101].forEach(function(n) {
            it('throws for out-of-range n value: ' + n, function() {
                validateInvalidN(n, 'n must be between 0 and 100');
            });
        });
        
        [null, '5', {}, [], function() {}].forEach(function(n) {
            it('throws for invalid n value: ' + (JSON.stringify(n) || n.toString()), function() {
                validateInvalidN(n, 'n is not a number');
            });
        });
    });
    
    describe('#iqr', function() {
        var data = [1, 2, 3, 4, 5, 6, 7];
        
        it('returns all 5 iqr values', function() {
            expect(stats.iqr(data)).to.have.all.keys([
                'min', 'q1', 'q2', 'q3', 'max'
            ]);
        });
        
        it('returns the expected values', function() {
            expect(stats.iqr(data)).to.deep.equal({
                min: 1,
                max: 7,
                q1: stats.percentile(data, 25),
                q2: 4, // mdeian
                q3: stats.percentile(data, 75)
            });
        });
    });
});

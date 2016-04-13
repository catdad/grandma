/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var stats = require('../lib/stats.js');

describe('[stats]', function() {
    it('has all expected keys', function() {
        expect(stats).to.have.all.keys(['mean', 'median', 'percentile']);
    });
});

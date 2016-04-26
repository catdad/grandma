/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var index = require('../index');


describe('[index]', function() {
    it('exposes a cliPath method', function() {
        expect(index).to.have.property('cliPath').and.to.be.a('function');
        expect(index.cliPath()).to.be.a('string');
    });
});

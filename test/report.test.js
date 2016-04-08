/* jshint node: true, mocha: true */

var expect = require('chai').expect;
var through = require('through2');

var TESTDATA = {};

describe('[report]', function() {
    it('takes an input and output stream');
    it('reads data from the input stream');
    it('writes results to the output stream');
    
    describe('#json', function() {
        it('provides readable json data');
    });
    describe('#text', function() {
        it('provides pretty text data');
    });
    describe('#plot', function() {
        it('provides an html page');
    });
});

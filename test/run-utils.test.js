/* eslint-env mocha */

var expect = require('chai').expect;
var through = require('through2');

var runUtils = require('../lib/run-utils.js');

describe.only('[run-utils]', function() {
    it('wraps the output stream and returns a new stream in the exports', function() {
        var a = through();
        
        var util = runUtils({
            output: a
        });
        
        expect(util.output)
            .and.to.have.property('pipe')
            .and.to.be.a('function');
        expect(util.output).to.not.equal(a);
    });
    
    describe('#wrapStream', function() {
        it.skip('returns a new stream', function(done) {
            var input = through();
            
            runUtils({
                output: input
            });
        });
        it('returns an object stream when objectMode is set on utils');
        it('can gzip data');
        it('triggers the "fullEnd" event when the data ends');
    });
    
    describe('#writeToStream', function() {
        it('can write existing Buffer data');
        it('can write string data');
        it('can write JSON data');
        it('writes objects when objectMode is set on the utils');
    });
    
    describe('#debug', function() {
        it('writes to a stream when debug mode is enabled');
    });
    
    describe('#debugError', function() {
        it('writes to a stream when debug error mode is enabled');
    });
});

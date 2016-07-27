/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

var zlib = require('zlib');

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');

// module we are using as a helper
var isStream = require('../lib/is-stream.js');

// module we are actually testing here
var runUtils = require('../lib/run-utils.js');

function assertStream(funcName, stream) {
    // for ease, we will just test the writable state
    return function() {
        isStream[funcName](stream, 'writable', 'not a stream');
    };
}

describe('[run-utils]', function() {
    it('wraps the output stream and returns a new stream in the exports', function() {
        var a = through();
        
        var util = runUtils({
            output: a
        });
        
        expect(assertStream('assertStream', util.output))
            .to.not.throw();
        expect(util.output)
            .and.to.have.property('pipe')
            .and.to.be.a('function');
        expect(util.output).to.not.equal(a);
    });
    
    describe('#wrapStream', function() {
        it('returns a new stream', function() {
            var a = through();
            
            var util = runUtils({
                output: a
            });
            
            expect(assertStream('assertStream', util.output))
                .to.not.throw();
            expect(util.output)
                .and.to.have.property('pipe')
                .and.to.be.a('function');
            expect(util.output).to.not.equal(a);
        });
        it('returns an object stream when objectMode is set on utils', function() {
            var a = through();
            
            var util = runUtils({
                objectMode: true,
                output: a
            });
            
            expect(assertStream('assertObjectStream', util.output))
                .to.not.throw();
            expect(util.output)
                .and.to.have.property('pipe')
                .and.to.be.a('function');
            expect(util.output).to.not.equal(a);
        });
        it('writes all data from the wrapped stream to the original', function(done) {
            var DATA = 'pineapples';
            var target = through();
            
            var wrapped = runUtils({
                output: target
            }).output;
            
            target.pipe(es.wait(function(err, data) {
                expect(err).to.not.be.ok;
                expect(data.toString()).to.equal(DATA);
                
                done();
            }));
            
            wrapped.end(DATA);
        });
        it('triggers the "fullEnd" event when the data ends', function(done) {
            var DATA = 'pineapples';
            var target = through();
            
            var wrapped = runUtils({
                output: target
            }).output;
            
            wrapped.on('fullEnd', function() {
                // what do we test here?
                done();
            });
            
            wrapped.end(DATA);
        });
        it('can gzip data', function(done) {
            var DATA = 'pineapples';
            var target = through();
            
            var wrapped = runUtils({
                zip: true,
                output: target
            }).output;
            
            // target will contained gzipped data, so we will
            // unzip it before reading
            target.pipe(zlib.createGunzip()).pipe(es.wait(function(err, data) {
                expect(err).to.not.be.ok;
                expect(data.toString()).to.equal(DATA);
                
                done();
            }));
            
            wrapped.end(DATA);
        });
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

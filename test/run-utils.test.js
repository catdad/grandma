/* eslint-env mocha */

describe('[run-utils]', function() {
    describe('#wrapStream', function() {
        it('returns a new stream');
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

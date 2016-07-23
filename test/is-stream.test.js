/* eslint-env mocha */

var fs = require('fs');

var expect = require('chai').expect;
var through = require('through2');

var isStream = require('../lib/is-stream.js');

describe('[is-stream]', function() {
    var NULLDEV = /^win/.test(process.platform) ?
        '\\\\.\\NUL' :
        '/dev/null';

    function nullRStream() {
        return fs.createReadStream(NULLDEV);
    }
    function nullWStream() {
        return fs.createWriteStream(NULLDEV);
    }
    
    function test() {
        var args = arguments;
        
        return function() {
            isStream.assertStream.apply(undefined, args);
        };
    }
    
    function testObjectMode() {
        var args = arguments;
        
        return function() {
            isStream.assertObjectStream.apply(undefined, args);
        };
    }
    
    function testPositive(val, type, objectMode) {
        var func = objectMode ? testObjectMode : test;
        var errStr = 'custom error string';
        expect(func(val, type, errStr)).to.not.throw();
    }
    
    function testNegative(val, type, objectMode) {
        var func = objectMode ? testObjectMode : test;
        var errStr = 'custom error string';
        expect(func(val, type, errStr)).to.throw(TypeError, errStr);
    }
    
    it('accepts a ReadableStream as a readable stream', function() {
        var stream = nullRStream();
        testPositive(stream, 'readable');
        stream.close();
    });
    
    it('accepts a WritableStream as a writable stream', function() {
        var stream = nullWStream();
        testPositive(stream, 'writable');
        stream.close();
    });
    
    it('accepts a through stream as a readable stream', function() {
        testPositive(through(), 'readable');
    });
    
    it('accepts a through stream as a writable stream', function() {
        testPositive(through(), 'readable');
    });
    
    it('accepts a through object stream as a readable object stream', function() {
        testPositive(through.obj(), 'readable', true);
    });
    
    it('accepts a through object stream as a writable object stream', function() {
        testPositive(through.obj(), 'readable', true);
    });
    
    it('errors for a writable stream validated as a readable stream', function() {
        var stream = nullWStream();
        testNegative(stream, 'readable');
        stream.close();
    });
    
    it('errors for a readable stream validated as a writable stream', function() {
        var stream = nullRStream();
        testNegative(stream, 'writable');
        stream.close();
    });
    
    it('errors for a readable stream validated as a readable object stream', function() {
        var stream = nullRStream();
        testNegative(stream, 'readable', true);
        stream.close();
    });
    it('errors for a writable stream validated as a writable object stream', function() {
        var stream = nullWStream();
        testNegative(stream, 'writable', true);
        stream.close();
    });
    
    [
        null,
        undefined,
        NaN,
        42,
        'string',
        {},
        [],
        function() {}
    ].forEach(function(val) {
        var str = val === undefined ? 'undefined' :
            JSON.stringify(val) || val.toString();
        
        it('errors as a readable stream for invalid value: ' + str, function() {
            testNegative(val, 'readable');
        });
        
        it('errors as a writable stream for invalid value: ' + str, function() {
            testNegative(val, 'writable');
        });
        
        it('errors as a readable object stream for invalid value: ' + str, function() {
            testNegative(val, 'readable', true);
        });
        
        it('errors as a writable object stream for invalid value: ' + str, function() {
            testNegative(val, 'writable', true);
        });
    });
});

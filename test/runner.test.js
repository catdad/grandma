/* eslint-env mocha */

var expect = require('chai').expect;
var sinon = require('sinon');

function test(name, testFunc, itFunc) {
    var clock;

    if (!itFunc) {
        itFunc = it;
    }
    
    if (!testFunc) {
        return itFunc(name);
    }
    
    var isAsync = testFunc.length > 1;
    
    itFunc(name, function(done) {
        if (clock) {
            clock.restore();
            clock = null;
        }
        
        clock = sinon.useFakeTimers();

        function onDone(err) {
            clock.restore();
            clock = null;
            
            done(err);
        }
        
        if (isAsync) {
            return testFunc(clock, onDone);
        }
        
        try {
            testFunc(clock);
        } catch(e) {
            return onDone(e);
        }
            
        onDone();
    });
}

test.only = function(name, testFunc) {
    return test(name, testFunc, it.only);
};

function sharedTests() {
    test('does not run anything until _start is called');
}

describe('[runner]', function() {
    describe('concurrent mode', function() {
        test('can be called in concurrnet mode');
        
        sharedTests();
    });
    
    describe('rate mode', function() {
        test('can be called in rate mode');
        
        sharedTests();
    });
});

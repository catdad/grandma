/* eslint-env mocha */

var expect = require('chai').expect;

var test = require('./_util/timeTest.js');

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

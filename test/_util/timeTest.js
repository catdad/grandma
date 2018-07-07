/* eslint-env mocha */

var sinon = require('sinon');

function fakeTimeTest(name, testFunc, itFunc) {
    var clock;

    if (!testFunc) {
        return itFunc(name);
    }

    var isAsync = testFunc.length > 1;

    itFunc(name, function(done) {
        var context = this;

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
            return testFunc.call(context, clock, onDone);
        }

        try {
            testFunc.call(context, clock);
        } catch(e) {
            return onDone(e);
        }

        onDone();
    });
}

module.exports = function test(name, testFunc) {
    return fakeTimeTest(name, testFunc, it);
};

module.exports.only = function testOnly(name, testFunc) {
    return fakeTimeTest(name, testFunc, it.only);
};

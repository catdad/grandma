/* eslint-env mocha */

var expect = require('chai').expect;
var sinon = require('sinon');

var test = require('./_util/timeTest.js');

var lib = require('../lib/runner.js');

function sharedTests(getOpts) {
    test('does not run anything until _start is called');

    test('writes a header once _start is called', function(clock) {
        var opts = getOpts();
        opts.writeOutput = sinon.spy();

        var api = lib(opts);

        expect(opts.writeOutput.callCount).to.equal(0);

        api._start({}, sinon.spy());

        expect(opts.writeOutput.callCount).to.equal(1);

        var args = opts.writeOutput.firstCall.args;

        expect(args).to.be.an('array')
            .and.to.have.lengthOf(1)
            .and.to.have.property(0)
            .and.to.deep.equal({
                type: 'header',
                epoch: 0,
                duration: opts.options.duration,
                targetCount: opts.mode === 'rate' ?
                    Math.floor(opts.options.rate * (opts.options.duration / 1000)) :
                    null,
                name: null,
                rate: opts.options.rate || null,
                concurrent: opts.options.concurrent || null
            });
    });

    test('writes to the debug stream with runner info', function(clock) {
        var opts = getOpts();
        opts.debug = sinon.spy();

        var api = lib(opts);

        expect(opts.debug.callCount).and.to.equal(0);

        api._start({}, sinon.spy());

        expect(opts.debug.callCount).and.to.equal(1);

        // TODO test params too?
    });

    test('can be paused and resumed', function(clock) {
        var ITERATION_COUNT = 10;
        var ITERATION_SECS = 10;
        var opts = getOpts();
        opts.options.duration = ITERATION_SECS * 1000;

        if (opts.options.concurrent) {
            opts.options.concurrent = ITERATION_COUNT;
        }

        if (opts.options.rate) {
            opts.options.rate = ITERATION_COUNT;
        }

        var api = lib(opts);
        var runSpy = sinon.spy();
        var doneSpy = sinon.spy();

        api._start({}, doneSpy);
        api.on(api.EVENTS.RUN, runSpy);

        function iterate(secs) {
            clock.tick(1000 * (secs || 1));

            // make sure that any tests waiting to finish are finished
            // at this point
            if (api.runningCount) {
                var count = api.runningCount;

                while (count--) {
                    api.emit(api.EVENTS.COMPLETE);
                }
            }
        }

        expect(runSpy.callCount).to.equal(0);

        iterate(1);

        // expect 1x progress, since we did one iteration
        expect(runSpy.callCount).to.equal(ITERATION_COUNT);

        api.pause();

        iterate(4);

        // expect that no progress was made while paused
        expect(runSpy.callCount).to.equal(ITERATION_COUNT);

        api.resume();

        iterate(1);

        // expect 2x progress, since we resumed and did one
        // more iteration
        expect(runSpy.callCount).to.equal(ITERATION_COUNT * 2);

        // finish up the remaining time
        clock.tick(1000 * ITERATION_SECS);

        expect(doneSpy.callCount).to.equal(1);
    });

    test('can be stopped after it has been started', function(clock) {
        var opts = getOpts();

        var api = lib(opts);
        var doneSpy = sinon.spy();

        api._start({}, doneSpy);
        api.stop();

        expect(doneSpy.callCount).to.equal(1);
    });

    test('can be stopped before is has been started', function(clock) {
        var opts = getOpts();

        var api = lib(opts);
        var doneSpy = sinon.spy();

        api.stop();
        api._start({}, doneSpy);

        expect(doneSpy.callCount).to.equal(1);
    });

    test('waits for outstanding tests to finish after it is stopped');

    test('emits a run event when it is time to start a new test');
}

describe('[runner]', function() {
    describe('concurrent mode', function() {
        function getOpts() {
            return {
                debug: sinon.spy(),
                writeOutput: sinon.spy(),
                mode: 'concurrent',
                options: {
                    concurrent: 5,
                    duration: 1000
                }
            };
        }

        test('can be called in concurrnet mode', function(clock) {
            var opts = getOpts();
            var api = lib(opts);
            var context = {};
            var count = 0;

            function onRun(ev) {
                expect(ev).to.deep.equal({ context: context });
                count += 1;
            }

            api.on(api.EVENTS.RUN, onRun);

            api._start({}, sinon.spy());
            clock.tick(opts.options.duration);

            expect(count).to.equal(opts.options.concurrent);
        });

        test('runs the tests an expected number of times', function(clock) {
            var ITERATIONS = 8;
            var opts = getOpts();

            opts.options.concurrent = 5;
            opts.options.duration = 1000;

            var count = 0;
            var api = lib(opts);

            function runTest() {
                api.emit(api.EVENTS.COMPLETE);
            }

            function onRun(ev) {
                count += 1;

                setTimeout(runTest, opts.options.duration / ITERATIONS);
            }

            api.on(api.EVENTS.RUN, onRun);

            api._start({}, sinon.spy());

            clock.tick(opts.options.duration);

            expect(count).to.equal(ITERATIONS * opts.options.concurrent);
        });

        test('replaces each finished test with a new one');

        sharedTests(getOpts);
    });

    describe('rate mode', function() {
        function getOpts() {
            return {
                debug: sinon.spy(),
                writeOutput: sinon.spy(),
                mode: 'rate',
                options: {
                    rate: 10,
                    duration: 1000
                }
            };
        }

        test('can be called in rate mode', function(clock) {
            var opts = getOpts();
            var api = lib(opts);
            var context = {};
            var count = 0;

            function onRun(ev) {
                expect(ev).to.deep.equal({ context: context });
                count += 1;
            }

            api.on(api.EVENTS.RUN, onRun);

            api._start({}, sinon.spy());
            clock.tick(opts.options.duration);

            expect(count).to.equal(opts.options.rate);
        });

        test('runs the tests an expected number of times', function(clock) {
            var ITERATIONS = 8;
            var opts = getOpts();

            opts.options.rate = 10;
            opts.options.duration = 1000 * ITERATIONS;

            var count = 0;

            function onRun(ev) {
                count += 1;
            }

            var api = lib(opts);

            api.on(api.EVENTS.RUN, onRun);

            api._start({}, sinon.spy());

            clock.tick(opts.options.duration);

            expect(count).to.equal(ITERATIONS * opts.options.rate);
        });

        test('runs a new test at the expected interval', function(clock) {
            this.skip();

            // TODO

            // do one iteration
            // check that a spy was called once

            // do two iterations
            // check that a spy was called twice
        });

        sharedTests(getOpts);
    });
});

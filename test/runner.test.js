/* eslint-env mocha */

var expect = require('chai').expect;
var sinon = require('sinon');

var test = require('./_util/timeTest.js');

var lib = require('../lib/runner.js');

function equalize(opts, num) {
    if (opts.options.concurrent) {
        opts.options.concurrent = num;
    }

    if (opts.options.rate) {
        opts.options.rate = num;
    }

    return opts;
}

function finish(api, onEach) {
    var count = api.runningCount;

    while (count--) {
        api.emit(api.EVENTS.COMPLETE);

        if (onEach) {
            onEach(count);
        }
    }
}

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
        var opts = equalize(getOpts(), ITERATION_COUNT);
        opts.options.duration = ITERATION_SECS * 1000;

        var api = lib(opts);
        var runSpy = sinon.spy();
        var doneSpy = sinon.spy();

        api.on(api.EVENTS.RUN, runSpy);

        expect(runSpy.callCount).to.equal(0);

        api._start({}, doneSpy);

        function iterate(secs) {
            clock.tick(1000 * (secs || 1));

            // make sure that any tests waiting to finish are finished
            // at this point
            if (api.runningCount) {
                finish(api);
            }
        }

        if (opts.mode === 'concurrent') {
            // concurrent runs tests immediately, while rate
            // runs tests at the tail end of the interval,
            // so to keep this test the same as possible, we will
            // reset the spy here
            expect(runSpy.callCount).to.equal(ITERATION_COUNT);
            runSpy.reset();
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
        finish(api);

        expect(doneSpy.callCount).to.equal(1);
    });

    test('can be stopped after it has been started', function(clock) {
        var opts = getOpts();

        var api = lib(opts);
        var doneSpy = sinon.spy();

        api._start({}, doneSpy);
        api.stop();

        finish(api);

        expect(doneSpy.callCount).to.equal(1);
    });

    test('can be stopped before is has been started', function(clock) {
        var opts = getOpts();

        var api = lib(opts);
        var doneSpy = sinon.spy();

        api.stop();
        api._start({}, doneSpy);

        finish(api);

        expect(doneSpy.callCount).to.equal(1);
    });

    test('waits for outstanding tests to finish after duration is done', function(clock) {
        var ITERATION_COUNT = 10;
        var opts = equalize(getOpts(), ITERATION_COUNT);

        var api = lib(opts);
        var runSpy = sinon.spy();
        var doneSpy = sinon.spy();

        api.on(api.EVENTS.RUN, runSpy);
        api._start({}, doneSpy);

        expect(doneSpy.callCount).to.equal(0);

        clock.tick(opts.options.duration);

        // make sure that all expected test are still running
        expect(runSpy.callCount).to.equal(ITERATION_COUNT);
        expect(api.runningCount).to.equal(ITERATION_COUNT);
        expect(doneSpy.callCount).to.equal(0);

        // finish all the tests
        var count = api.runningCount;
        while (count--) {
            api.emit(api.EVENTS.COMPLETE);
            expect(api.runningCount).to.equal(count);
        }

        expect(api.runningCount).to.equal(0);
        expect(doneSpy.callCount).to.equal(1);
    });

    test('waits for outstanding tests to finish when manually stopped', function(clock) {
        var ITERATION_COUNT = 10;
        var opts = equalize(getOpts(), ITERATION_COUNT);
        opts.options.duration = opts.mode === 'rate' ? 2000 : 1001;

        var api = lib(opts);
        var runSpy = sinon.spy();
        var doneSpy = sinon.spy();

        api.on(api.EVENTS.RUN, runSpy);
        api._start({}, doneSpy);

        expect(doneSpy.callCount).to.equal(0);

        clock.tick(1000);

        // make sure that all expected test are still running
        expect(runSpy.callCount).to.equal(ITERATION_COUNT);
        expect(api.runningCount).to.equal(ITERATION_COUNT);
        expect(doneSpy.callCount).to.equal(0);

        api.stop();

        expect(doneSpy.callCount).to.equal(0);

        // finish all the tests
        finish(api, function(count) {
            expect(api.runningCount).to.equal(count);
        });

        expect(api.runningCount).to.equal(0);
        expect(doneSpy.callCount).to.equal(1);
    });
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

        test('replaces each finished test with a new one', function(clock) {
            var CONCURRENT = 2;
            var opts = getOpts();
            opts.options.concurrent = CONCURRENT;

            var api = lib(opts);
            var runSpy = sinon.spy();
            var doneSpy = sinon.spy();

            api.on(api.EVENTS.RUN, runSpy);
            api._start({}, doneSpy);

            // we always call the first set immediately
            expect(runSpy.callCount).to.equal(CONCURRENT);

            var temp = 10;
            var count = CONCURRENT;

            while (temp--) {
                count += 1;

                // finish a test
                api.emit(api.EVENTS.COMPLETE);

                // finishing a test immediately starts a new one
                expect(runSpy.callCount).to.equal(count);

                // make sure there are still the expected number
                // of total tests running
                expect(api.runningCount).to.equal(CONCURRENT);
            }

            clock.tick(opts.options.duration);
            finish(api);

            expect(doneSpy.callCount).to.equal(1);
        });

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
            var COUNT = 4;
            var SINGLE_TIME = 1000 / COUNT;

            var opts = getOpts();
            opts.options.rate = 4;
            opts.options.duration = 5000;

            var total = COUNT * (opts.options.duration / 1000);
            var ticks = 0;

            var api = lib(opts);
            var runSpy = sinon.spy();
            var doneSpy = sinon.spy();

            api.on(api.EVENTS.RUN, runSpy);
            api._start({}, doneSpy);

            expect(runSpy.callCount).to.equal(0);

            while (runSpy.callCount < total) {
                clock.tick(SINGLE_TIME);
                ticks += 1;

                expect(runSpy.callCount).to.equal(ticks);
            }

            finish(api);

            expect(doneSpy.callCount).to.equal(1);
        });

        sharedTests(getOpts);
    });
});

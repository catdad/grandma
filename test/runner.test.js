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

        expect(opts.writeOutput).to.have.property('callCount').and.to.equal(0);

        api._start({}, sinon.spy());

        expect(opts.writeOutput).to.have.property('callCount').and.to.equal(1);

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

        expect(opts.debug).to.have.property('callCount').and.to.equal(0);

        api._start({}, sinon.spy());

        expect(opts.debug).to.have.property('callCount').and.to.equal(1);

        // TODO test params too?
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

        sharedTests(getOpts);
    });
});

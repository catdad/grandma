/* eslint-env mocha */

var expect = require('chai').expect;
var sinon = require('sinon');

var test = require('./_util/timeTest.js');

var lib = require('../lib/runner.js');

function sharedTests(getOpts) {
    test('does not run anything until _start is called');
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

        sharedTests(getOpts);
    });
});

/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var EventEmitter = require('events');

var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('lodash');

// TODO temp, while I am updating this API
// this will need a ton of cleanup
var helper = require('./run-mode-helper.temp.js');
var rmr = function(opts) {
    return helper(require('../lib/run-mode-rate.js'))(opts);
};

function runOpts(opts) {
    var o = _.extend({
        rate: 10,
        duration: 1000
    }, opts ? opts.opts : {});

    return _.extend({
        debug: sinon.spy(),
        options: o,
        writeOutput: sinon.spy(),
        getRunningCount: sinon.stub().returns(0),
        repeater: new EventEmitter(),
        runTest: sinon.spy()
    }, opts);
}

describe('[run-mode-rate]', function() {
    it('starts tests at an internal, even if they are not finishing');

    it('can run indefinitely when using a value of 0', function(done) {
        var opts = runOpts({
            opts: {
                duration: 0
            }
        });

        var task = rmr(opts);

        var count = 0;

        task._startX({}, function() {
            expect(count).to.equal(5);
            done();
        });

        var interval = setInterval(function() {
            if (count === 5) {
                clearInterval(interval);
                task.stop();

                return;
            }

            count += 1;
            opts.repeater.emit('tick');
        }, 2);
    });

    it('stops running tests after a defined duration');

    it('can have rate changed at runtime');
});

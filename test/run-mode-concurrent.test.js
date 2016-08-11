/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var EventEmitter = require('events');

var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('lodash');
var async = require('async');

var rmc = require('../lib/run-mode-concurrent.js');

function runOpts(opts) {
    var o = _.extend({
        concurrent: 1,
        duration: 1000
    }, opts ? opts.opts : {});
    
    return _.extend({
        debug: sinon.spy(),
        options: o,
        writeOutput: sinon.spy(),
        // TODO
        getRunningCount: sinon.stub().returns(0),
        repeater: new EventEmitter(),
        runTest: sinon.spy()
    }, opts);
}

describe('[run-mode-concurrent]', function() {
    it('starts a defined number of concurrent tests immediately', function(done) {
        var run = sinon.spy();
        
        var task = rmc(runOpts({
            runTest: run,
            opts: {
                concurrent: 4
            }
        }));
        
        task._start({}, function() {
            expect(run.callCount).to.equal(4);
            done();
        });
        
        task.stop();
    });
    
    it('starts a new test when the tick event fires', function(done) {
        var opts = runOpts({
            opts: {
                concurrent: 1
            },
            getRunningCount: function() { return 0; }
        });
        
        var count = 0;
        
        var task = rmc(opts);
        
        task._start({}, function() {
            expect(count).to.equal(5);
            done();
        });
        
        opts.runTest.reset();
        
        async.timesSeries(5, function(idx, next) {
            count += 1;
            expect(opts.runTest.callCount).to.equal(0);
            
            setTimeout(function() {
                opts.repeater.emit('tick');
                expect(opts.runTest.callCount).to.equal(1);
                
                opts.runTest.reset();
                next();
            }, 0);
        }, task.stop);
    });
    
    it('waits for all tests to finish running when the duration is reached');
    
    it('calls the debug method with concurrency information');
    
    it('can have concurrency changes at runtime');
});

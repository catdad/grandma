/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks */

var EventEmitter = require('events');

var expect = require('chai').expect;
var _ = require('lodash');

var rmc = require('../lib/run-mode-concurrent.js');

function runOpts(opts) {
    var o = _.extend({
        concurrent: 1
    }, opts ? opts.opts : {});
    
    return _.extend({
        debug: _.noop,
        options: o,
        writeOutput: _.noop,
        // TODO
        getRunningCount: _.noop,
        repeater: new EventEmitter(),
        runTest: _.noop
    }, opts);
}

describe.only('[run-mode-concurrent]', function() {
    it('starts a defined number of concurrent tests immediately', function(done) {
        var count = 0;
        
        function count4() {
            count += 1;
        }
        
        var task = rmc(runOpts({
            runTest: count4,
            opts: {
                concurrent: 4
            }
        }));
        
        task._start({}, function() {
            expect(count).to.equal(4);
            done();
        });
        
        task.stop();
    });
    
    it('starts a new test when the tick event fires');
    
    it('waits for all tests to finish running when the duration is reached');
    
    it('calls the debug method with concurrency information');
});

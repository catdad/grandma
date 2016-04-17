/* jshint node: true, mocha: true, expr: true */

var path = require('path');

var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');
var through = require('through2');
var es = require('event-stream');

var run = require('../lib/run.js');

var fixtures = {
    tests: [{
        path: path.resolve(__dirname, '../fixtures/test.small.js'),
        name: 'test.small'
    }]
};

describe('[run]', function() {
    it('runs tests in rate mode, outputting to a stream', function(done) {
        this.timeout(1000 * 5);
        
        var output = through();
        var opts = _.defaultsDeep({
            output: output,
            // we expect this to execute exactly twice
            duration: '10ms',
            rate: 1000 / 10 * 2
        }, fixtures);
        
        async.parallel([
            function(next) {
                run(opts, function(err) {
                    expect(err).to.not.be.ok;
                    next();
                });
            },
            function(next) {
                output.pipe(es.wait(function(err, data) {
                    expect(err).to.not.be.ok;
                    
                    var lines = data.toString().trim().split('\n').map(JSON.parse);
                    
                    expect(lines).to.be.an('array').and.to.have.length(3);
                    
                    var header = lines.shift();
                    
                    expect(header).to.have.property('type').and.to.equal('header');

                    next();
                }));        
            }
        ], done);
    });
    
    it('runs tests in concurrency mode, outputting to a stream', function(done) {
        this.timeout(1000 * 5);
        
        var output = through();
        var opts = _.defaultsDeep({
            output: output,
            // we expect this to execute exactly twice
            duration: 0,
            concurrent: 2
        }, fixtures);
        
        async.parallel([
            function(next) {
                run(opts, function(err) {
                    expect(err).to.not.be.ok;
                    next();
                });
            },
            function(next) {
                output.pipe(es.wait(function(err, data) {
                    expect(err).to.not.be.ok;
                    
                    var lines = data.toString().trim().split('\n').map(JSON.parse);
                    
                    expect(lines).to.be.an('array').and.to.have.length(3);
                    
                    var header = lines.shift();
                    
                    expect(header).to.have.property('type').and.to.equal('header');

                    next();
                }));        
            }
        ], done);
    });
    
    function testError(opts, errorStr, done) {
        // all errors must be returned asynchronously
        var isAsync = false;
        
        run(opts, function(err) {
            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('message').and.to.equal(errorStr);

            expect(isAsync).to.equal(true);

            done();
        });
        
        isAsync = true;
    }
    
    it('errors if duration is not defined in options', function(done) {
        testError(_.defaultsDeep({
            output: through(),
            rate: 1
        }, fixtures), 'duration is not defined', done);
    });
    
    [null, 'junk', [], {}, function() {}].forEach(function(val) {
        it('errors for invalid duration value: ' + (JSON.stringify(val) || val.toString()), function(done) {
            testError(_.defaultsDeep({
                output: through(),
                duration: val,
                rate: 1
            }, fixtures), 'duration is invalid', done);
        });
    });
    
    [null, '1', 'junk', [], {}, function() {}].forEach(function(val) {
        it('errors for invalid rate value: ' + (JSON.stringify(val) || val.toString()), function(done) {
            testError(_.defaultsDeep({
                output: through(),
                duration: '1s',
                rate: val
            }, fixtures), 'rate is invalid', done);
        });
    });
    
    [null, '1', 'junk', [], {}, function() {}].forEach(function(val) {
        it('errors for invalid concurrent value: ' + (JSON.stringify(val) || val.toString()), function(done) {
            testError(_.defaultsDeep({
                output: through(),
                duration: '1s',
                concurrent: val
            }, fixtures), 'concurrent is invalid', done);
        });
    });
    
    it('errors if neither rate nor concurrent are defined in options', function(done) {
        testError(_.defaultsDeep({
            output: through(),
            duration: '1s'
        }, fixtures), 'either options.rate or options.concurrent is required', done);
    });
});

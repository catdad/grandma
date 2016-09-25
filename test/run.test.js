/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks, max-params */

var path = require('path');

var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');
var through = require('through2');
var es = require('event-stream');

var run = require('../lib/run.js');

describe('[run]', function() {
    function increaseTimeout(that) {
        that.timeout(1000 * 5);
    }
    
    function stringify(val) {
        return JSON.stringify(val) || val.toString();
    }
    
    function runRealTest(opts, runCallback, outputCallback, done) {
        var output = through();
        opts = _.defaultsDeep(opts, {
            output: output
        });
        
        async.parallel([
            function(next) {
                run(opts, function(err) {
                    runCallback(err);
                    next();
                });
            },
            function(next) {
                output.pipe(es.wait(function(err, data) {
                    outputCallback(err, data);
                    next();
                }));
            }
        ], done);
    }
    
    function getLines(data) {
        return data.toString().trim().split('\n').map(JSON.parse);
    }
    
    function testHeaderProps(header) {
        expect(header).to.have.all.keys([
            'type',
            'epoch',
            'duration',
            'rate',
            'concurrent',
            'targetCount',
            'name'
        ]);
    }
    
    it('runs tests in rate mode, outputting to a stream', function(done) {
        increaseTimeout(this);
        
        var opts = {
            // we expect this to execute exactly twice
            duration: '10ms',
            rate: 1000 / 10 * 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/test.small.js'),
                name: 'test.small'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
                    
            var lines = getLines(data);

            expect(lines).to.be.an('array').and.to.have.length.within(2, 4);

            var header = lines.shift();

            expect(header)
                .to.have.property('type')
                .and.to.equal('header');
            expect(header)
                .to.have.property('name')
                .and.to.equal('test.small');
            testHeaderProps(header);
        }, done);
    });
    
    it('runs tests in concurrency mode, outputting to a stream', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 50,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/test.concurrent.js'),
                name: 'test.concurrent'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;

            var lines = getLines(data);
            
            expect(lines).to.be.an('array').and.to.have.length(5);

            var header = lines.shift();

            expect(header)
                .to.have.property('type')
                .and.to.equal('header');
            expect(header)
                .to.have.property('name')
                .and.to.equal('test.concurrent');
            testHeaderProps(header);
        }, done);
    });
    
    it('runs tests in multiple threads', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: '10ms',
            rate: 1000 / 10 * 4,
            test: {
                path: path.resolve(__dirname, '../fixtures/test.small.js'),
                name: 'test.small'
            },
            threads: 2
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
                    
            var lines = getLines(data);

            var header = lines.shift();
            expect(header).to.have.property('type').and.to.equal('header');
            testHeaderProps(header);
            
            var threadCounts = lines.reduce(function(a, b) {
                a[b.id] += 1;
                return a;
            }, { '0': 0, '1': 0 });
            
            expect(threadCounts).to.have.all.keys(['0', '1']);
            expect(threadCounts).to.have.property('0')
                .and.to.be.at.least(2)
                .and.to.be.at.most(3);
            expect(threadCounts).to.have.property('1')
                .and.to.be.at.least(2)
                .and.to.be.at.most(3);
        }, done);
    });
    
    it('does not stop for errors in beforeAll', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/errInBeforeAll.js'),
                name: 'errInBeforeAll'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;

            var lines = getLines(data);

            expect(lines).to.be.an('array').and.to.have.length.of.at.least(2);
        }, done);
    });

    it('does not stop for errors in beforeEach', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/errInBeforeEach.js'),
                name: 'errInBeforeEach'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;

            var lines = getLines(data);

            expect(lines).to.be.an('array').and.to.have.length.of.at.least(2);
        }, done);
    });
    
    it('does not stop for errors in afterEach', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/errInAfterEach.js'),
                name: 'errInAfterEach'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;

            var lines = getLines(data);

            expect(lines).to.be.an('array').and.to.have.length.of.at.least(2);
        }, done);
    });
    
    it('does not stop for errors in afterAll', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/errInAfterAll.js'),
                name: 'errInAfterEach'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;

            var lines = getLines(data);

            expect(lines).to.be.an('array').and.to.have.length.of.at.least(2);
        }, done);
    });
    
    it('has an optional timeout value', function(done) {
        increaseTimeout(this);
        
        var opts = {
            duration: 10,
            concurrent: 1,
            timeout: '1ms',
            test: {
                path: path.resolve(__dirname, '../fixtures/minute.js'),
                name: 'minute'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.not.be.ok;
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
            
            var lines = getLines(data);
            
            // remove header
            lines.shift();
            
            expect(lines.length).to.be.at.least(1);
            
            lines.forEach(function(line) {
                expect(line.report.fullTest.status).to.equal('failure');
                expect(line.report.fullTest.errorCode).to.equal(-1);
            });
            
            done();
        });
    });
    
    it('can run tests and output object to an object stream', function(done) {
        increaseTimeout(this);
        
        var output = through.obj();
        var ended = false;
        
        var opts = {
            duration: 50,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/test.concurrent.js'),
                name: 'test.concurrent'
            },
            output: output
        };
        
        output.on('end', function() {
            ended = true;
        });
        
        output.on('data', function(data) {
            expect(data).to.be.an('object');
            expect(Buffer.isBuffer(data)).to.equal(false);
            
            // test a prop to make sure it's tere
            expect(data).to.have.property('type').and.to.be.a('string');
        });
        
        run(opts, function(err) {
            if (err) {
                return done(err);
            }
            
            expect(ended).to.equal(true);
            done();
        });
    });
    
    it('errors if the test file does not exist', function(done) {
        var FILE = 'non-existent-test-file-' + Math.random().toString().replace(/\./g, '') + '.js';
        
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures', FILE),
                name: 'nonexistent'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.have.property('message')
                .and.to.match(/Cannot find module/);
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
            expect(data.toString()).to.equal('');
        }, done);
    });
    
    it('errors if the test file throws immediately', function(done) {
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/throwsOnRequire.js'),
                name: 'throwsOnRequire'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.have.property('message')
                .and.to.equal('throws on require');
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
            expect(data.toString()).to.equal('');
        }, done);
    });
    
    it('errors if the test file does not have a "test" method', function(done) {
        var opts = {
            duration: 10,
            concurrent: 2,
            test: {
                path: path.resolve(__dirname, '../fixtures/noTestMethod.js'),
                name: 'noTestMethod'
            }
        };
        
        runRealTest(opts, function onRun(err) {
            expect(err).to.have.property('message')
                .and.to.match(/no test method was found in/);
        }, function onOutput(err, data) {
            expect(err).to.not.be.ok;
            expect(data.toString()).to.equal('');
        }, done);
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
    
    (function errorCases() {
        var fixtures = {
            test: {
                path: path.resolve(__dirname, '../fixtures/test.small.js'),
                name: 'test.small'
            }
        };
        
        it('errors if an output stream is not defined', function(done) {
            testError(fixtures, 'no writable output stream defined', done);
        });
        
        it('errors if the output stream is invalid', function(done) {
            testError(_.defaultsDeep({
                output: 'a string'
            }, fixtures), 'no writable output stream defined', done);
        });
        
        it('errors if duration is not defined in options', function(done) {
            testError(_.defaultsDeep({
                output: through(),
                rate: 1
            }, fixtures), 'duration is not defined', done);
        });

        it('errors if duration is too low', function(done) {
            testError(_.defaultsDeep({
                output: through(),
                rate: 1,
                duration: '2ms'
            }, fixtures), 'duration is too low', done);
        });

        [null, 'junk', [], {}, function() {}].forEach(function(val) {
            var name = 'errors for invalid duration value: ' + stringify(val);
            it(name, function(done) {
                testError(_.defaultsDeep({
                    output: through(),
                    duration: val,
                    rate: 1
                }, fixtures), 'duration is invalid', done);
            });
        });

        [null, '1', 'junk', [], {}, function() {}].forEach(function(val) {
            it('errors for invalid rate value: ' + stringify(val), function(done) {
                testError(_.defaultsDeep({
                    output: through(),
                    duration: '1s',
                    rate: val
                }, fixtures), 'rate is invalid', done);
            });
        });

        [null, '1', 'junk', [], {}, function() {}].forEach(function(val) {
            it('errors for invalid concurrent value: ' + stringify(val), function(done) {
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
    }());
    
});

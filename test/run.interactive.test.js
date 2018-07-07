/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-len, max-nested-callbacks, max-params */

var path = require('path');

var expect = require('chai').expect;
var _ = require('lodash');
var through = require('through2');

var run = require('../lib/run.js');

describe('[run:interactive]', function() {
    var CONCURRENT_TEST = {
        path: path.resolve(__dirname, '../fixtures/test.concurrent.js'),
        name: 'test.concurrent'
    };

    var RATE_TEST = {
        path: path.resolve(__dirname, '../fixtures/test.small.js'),
        name: 'test.small'
    };

    function increaseTimeout(that) {
        that.timeout(1000 * 5);
    }

    function pauseResumeTest(task, stream) {
        var isFirstWrite = true;
        var isPaused = false;
        var countAtPause = 0;

        function kickoff() {
            setTimeout(function() {
                isPaused = true;
                task.pause();
            }, 40);

            setTimeout(function() {
                isPaused = false;
                task.resume();
            }, 180);

            setTimeout(function() {
                task.stop();
            }, 200);
        }

        stream.on('data', function(data) {
            if (data.type === 'header') {
                return;
            }

            if (isFirstWrite && data.type === 'report') {
                kickoff();
                isFirstWrite = false;

                return;
            }

            if (isPaused) {
                countAtPause += 1;
            }
        });

        stream.on('end', function() {
            // without pausing, this number would be ~100,
            // when paused, it might be as high as 25 for concurrent
            // but we are well above that in the test
            expect(countAtPause).to.be.below(50);
        });
    }

    function readStream() {
        var stream = through.obj();
        stream.on('data', _.noop);

        return stream;
    }

    it('runs tests indefinitely with a duration of 0', function(done) {
        increaseTimeout(this);

        var output = through.obj();

        var opts = {
            duration: 0,
            rate: 50,
            test: RATE_TEST,
            output: output
        };

        var lines = [];

        var task = run(opts, function(err) {
            if (err) {
                return done(err);
            }

            var header = lines[0];

            expect(header)
                .to.have.property('type')
                .and.to.equal('header');
            expect(header)
                .to.have.property('targetCount')
                .and.to.equal(null);

            done();
        });

        output.on('data', function(line) {
            lines.push(line);

            if (lines.length === 5) {
                task.stop();
            }
        });
    });

    it('runs tests indefinitely with a duration string of 0s', function(done) {
        increaseTimeout(this);

        var output = through.obj();
        var lines = [];

        var opts = {
            duration: '0s',
            concurrent: 2,
            test: CONCURRENT_TEST,
            output: output
        };

        var task = run(opts, function(err) {
            if (err) {
                return done(err);
            }

            var header = lines[0];

            expect(header)
                .to.have.property('type')
                .and.to.equal('header');
            expect(header)
                .to.have.property('targetCount')
                .and.to.equal(null);

            done();
        });

        output.on('data', function(line) {
            lines.push(line);

            if (lines.length === 5) {
                task.stop();
            }
        });
    });

    describe('concurrent mode', function() {
        it('exposes the correct API', function(done) {
            var api = run({
                duration: 1,
                concurrent: 1,
                test: CONCURRENT_TEST,
                output: readStream()
            }, function(err) {
                if (err) {
                    return done(err);
                }

                expect(api).to.have.all.keys([
                    'concurrent',
                    'stop',
                    'pause',
                    'resume'
                ]);

                [api.stop, api.resume, api.pause].forEach(function(val) {
                    expect(val).to.be.a('function');
                });

                done();
            });
        });

        it('can have concurrency changed at runtime', function(done) {
            increaseTimeout(this);

            var INIT_C = 1;
            var FINAL_C = 20;
            var count = 0;

            var output = through.obj();

            var opts = {
                duration: 100,
                concurrent: INIT_C,
                test: CONCURRENT_TEST,
                output: output
            };

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                expect(count).to.be.at.least(FINAL_C);
                expect(task).to.have.property('concurrent')
                    .and.to.equal(FINAL_C);

                done();
            });

            var increateConcurrent = _.once(function() {
                task.concurrent = FINAL_C;
            });

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                    increateConcurrent();
                }
            });

            expect(task).to.have.property('concurrent')
                .and.to.equal(INIT_C);
        });

        it('can be stopped immediately', function(done) {
            var count = 0;

            var output = through.obj();

            var opts = {
                // set a long time, just in case
                duration: '3s',
                concurrent: 10,
                test: CONCURRENT_TEST,
                output: output
            };

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                }
            });

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                expect(count).to.equal(0);
                done();
            });

            expect(task).to.have.property('stop').and.to.be.a('function');
            task.stop();
        });

        it('can be stopped while running', function(done) {
            var count = 0;

            var output = through.obj();

            var opts = {
                // set a long time, just in case
                duration: '3s',
                concurrent: 10,
                test: CONCURRENT_TEST,
                output: output
            };

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                // we are stopping after the first concurrent
                // run, so we will have exactly the 10 that were
                // already started
                expect(count).to.equal(10);
                done();
            });

            var stopOnce = _.once(function() {
                task.stop();
            });

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                    stopOnce();
                }
            });
        });

        it('throws if the runtime concurrent value is set to a non-integer', function(done) {
            var task = run({
                duration: 50,
                concurrent: 1,
                test: CONCURRENT_TEST,
                output: readStream()
            }, done);

            expect(function() {
                task.concurrent = 3.14;
            }).to.throw(TypeError, 'concurrent must be a positive non-zero integer');

            task.stop();
        });

        it('can be paused and resumed', function(done) {
            var output = through.obj();

            var task = run({
                duration: 5000,
                concurrent: 10,
                test: CONCURRENT_TEST,
                output: output
            }, done);

            pauseResumeTest(task, output);
        });
    });

    describe('rate mode', function() {
        it('exposes the correct API', function(done) {
            var api = run({
                duration: 10,
                rate: 100,
                test: RATE_TEST,
                output: readStream()
            }, function(err) {
                if (err) {
                    return done(err);
                }

                expect(api).to.have.all.keys([
                    'rate',
                    'stop',
                    'pause',
                    'resume'
                ]);

                [api.stop, api.resume, api.pause].forEach(function(val) {
                    expect(val).to.be.a('function');
                });

                done();
            });
        });

        it('can have rate changed at runtime', function(done) {
            increaseTimeout(this);

            var count = 0;

            var output = through.obj();
            var INIT_RATE = 1000 / 10 * 2;
            var FINAL_RATE = 4000;

            var opts = {
                // run for a long time... we'll be stopping
                // it manually anyway
                duration: '5000ms',
                rate: INIT_RATE,
                test: RATE_TEST,
                output: output
            };

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                // rate is less scientific, so just make
                // sure it's more than the small amount previous
                // tests got
                expect(count).to.be.at.least(100);
                expect(task).to.have.property('rate')
                    .and.to.equal(FINAL_RATE);

                done();
            });

            var increaseConcurrent = _.once(function() {
                // a very large number, since we are running
                // the test for a very short time
                task.rate = FINAL_RATE;

                // manually stop the test so that we run quickly
                setTimeout(function() {
                    task.stop();
                }, 200);
            });

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                    increaseConcurrent();
                }
            });

            expect(task).to.have.property('rate')
                .and.to.equal(INIT_RATE);
        });

        it('can be stopped immediately', function(done) {
            var count = 0;

            var output = through.obj();

            var opts = {
                // set a long time, just in case
                duration: '3s',
                rate: 1000 / 10 * 2,
                test: RATE_TEST,
                output: output
            };

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                }
            });

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                expect(count).to.equal(0);
                done();
            });

            expect(task).to.have.property('stop').and.to.be.a('function');
            task.stop();
        });

        it('can be stopped while running', function(done) {
            var count = 0;

            var output = through.obj();

            var opts = {
                // set a long time, just in case
                duration: '3s',
                rate: 1000 / 10 * 2,
                test: RATE_TEST,
                output: output
            };

            var task = run(opts, function(err) {
                if (err) {
                    return done(err);
                }

                // the test probably started executing a second
                // time already by the time we get the first
                // report, so that will complete as well before
                // the stop happens
                expect(count).to.be.at.most(3);
                expect(count).to.be.at.least(1);
                done();
            });

            var stopOnce = _.once(function() {
                task.stop();
            });

            output.on('data', function(data) {
                if (data.report) {
                    count += 1;
                    stopOnce();
                }
            });
        });

        it('throws if the runtime rate value is set to a non-number', function(done) {
            var task = run({
                duration: '10ms',
                rate: 2000,
                test: RATE_TEST,
                output: readStream()
            }, done);

            expect(function() {
                task.rate = 'pineapples';
            }).to.throw(TypeError, 'rate must be a positive number');

            task.stop();
        });

        it('can be paused and resumed', function(done) {
            var output = through.obj();

            var task = run({
                duration: 5000,
                rate: 100,
                test: RATE_TEST,
                output: output
            }, done);

            pauseResumeTest(task, output);
        });

    });

});

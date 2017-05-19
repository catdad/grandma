/* eslint-env mocha */

var Stream = require('stream');

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');
var _ = require('lodash');
var unstyle = require('unstyle');

var DATA = require('./data/testdata.js');
var tableRegex = require('./data/testexpectations.js').tableRegex;

var diff = require('../').diff;

function writeData(stream, data) {
    setImmediate(function() {
        stream.end(_.map(data, JSON.stringify).join('\n'));
    });
    
    return stream;
}

function writeDataSlow(stream, data) {
    var chunks = data.slice();
    
    function writeToEnd() {
        if (chunks.length) {
            return setTimeout(function() {
                stream.write(JSON.stringify(chunks.shift()) + '\n');
                
                writeToEnd();
            }, 1);
        }
        
        stream.end();
    }
    
    writeToEnd();
    
    return stream;
}

function getReport(streams, options, callback) {
    var cb = _.once(callback);
    
    var output = through();

    var opts = _.defaults(options, {
        output: output,
        mode: 'fastest',
        type: 'text'
    });
    
    diff(streams, opts, function(err) {
        if (err) {
            return cb(err);
        }
    });
    
    // listen to output on the stream inside opts
    opts.output.pipe(es.wait(cb));
}

function hasColors(str) {
    return str !== unstyle.string(str);
}

function objToArr(obj) {
    return _.map(obj, function(item) {
        return item;
    });
}

function assertOrder(data, tests) {
    var indices = tests.map(function(name) {
        return data.indexOf(name);
    });
    
    // make sure that all results are above 0
    indices.forEach(function(i) {
        expect(i).to.be.above(0);
    });
    
    var sorted = indices.slice().sort(function(a, b) {
        return a - b;
    });
    
    expect(indices).to.deep.equal(sorted);
}

describe('[diff]', function() {
    it('takes an array of input streams and writes output', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(false);
            
            done();
        });
    });
    
    it('prints an array of input streams in the same order when reporting', function(done) {
        function namedData(name) {
            var data = _.cloneDeep(DATA.test);
            
            data[0].name = name;
            
            return data;
        }
        
        getReport([
            writeData(through(), namedData('testone')),
            writeDataSlow(through(), namedData('testtwo')),
            writeData(through(), namedData('testthree'))
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            assertOrder(data.toString(), ['testone', 'testtwo', 'testthree']);
            
            done();
        });
    });
    
    it('takes an object hash of input streams and writes output', function(done) {
        getReport({
            one: writeData(through(), DATA.test),
            two: writeData(through(), DATA.test)
        }, {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(false);
            
            done();
        });
    });
    
    it('prints an object hash of input streams in the same order when reporting', function(done) {
        getReport({
            testone: writeData(through(), DATA.test),
            testtwo: writeDataSlow(through(), DATA.test),
            testthree: writeData(through(), DATA.test)
        }, {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            assertOrder(data.toString(), ['testone', 'testtwo', 'testthree']);
            
            done();
        });
    });
    
    it('can write color output', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test)
        ], {
            color: true
        }, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            expect(hasColors(data)).to.equal(true);
            
            done();
        });
    });
    
    it('outputs percentages next to the latesncies of the slower average logs', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test2)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);

            var regex = tableRegex(
                'fullTest',
                '60\\.000ms \\(-[0-9]+%\\)',
                '60\\.000ms \\(-[0-9]+%\\)',
                '70\\.000ms \\(-[0-9]+%\\)',
                '70\\.000ms \\(-[0-9]+%\\)',
                '70\\.000ms \\(-[0-9]+%\\)'
            );

            expect(data).to.match(regex);
            
            done();
        });
    });
    
    it('outputs positive percentages if some metrics are faster', function(done) {
        getReport([
            writeData(through(), DATA.test2),
            writeData(through(), DATA.test_outlier)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);

            var regex = tableRegex(
                'fullTest',
                '60\\.000ms \\(-[0-9]+%\\)',
                '60\\.000ms \\(-[0-9]+%\\)',
                '70\\.000ms \\([0-9]+%\\)',
                '70\\.000ms \\([0-9]+%\\)',
                '70\\.000ms \\([0-9]+%\\)'
            );

            expect(data).to.match(regex);
            
            done();
        });
    });
    
    it('can handle some logs having custom metrics that other logs do not have', function(done) {
        getReport([
            writeData(through(), DATA.test2),
            writeData(through(), DATA.testerr)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            
            done();
        });
    });
    
    describe('errors if', function() {
        [{
            description: 'there are less than two streams',
            streams: {
                one: writeData(through(), DATA.test)
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('at least two streams are required for a diff');

                    done();
                });
            }
        }, {
            description: 'one of the stream items is not a stream',
            streams: {
                one: writeData(through(), DATA.test),
                two: 'not a stream'
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('streams is not an array or has object of readable streams');

                    done();
                });
            }
        }, {
            description: 'one of the stream items is not a readable stream',
            streams: {
                one: writeData(through(), DATA.test),
                two: new Stream.Writable()
            },
            test: function(streams, done) {
                getReport(streams, {}, function(err, data) {
                    expect(err).to.be.instanceOf(Error);

                    expect(err).to.have.property('message')
                        .and.to.equal('streams is not an array or has object of readable streams');

                    done();
                });
            }
        }].forEach(function(val) {
            it(val.description + ' in an array', function(done) {
                val.test(objToArr(val.streams), done);
            });
            
            it(val.description + ' in an object', function(done) {
                val.test(val.streams, done);
            });
        });
    
        it('there is no output stream', function(done) {
            diff([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                output: null
            }, function(err) {
                expect(err).to.be.instanceOf(TypeError);

                expect(err).to.have.property('message')
                    .and.to.equal('options.output is not a writable stream');

                done();
            });
        });
        
        it('errors if the output stream is not writable', function(done) {
            diff([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                output: new Stream.Readable()
            }, function(err) {
                expect(err).to.be.instanceOf(TypeError);

                expect(err).to.have.property('message')
                    .and.to.equal('options.output is not a writable stream');

                done();
            });
        });
        
        it('errors if options.mode is not a known value', function(done) {
            getReport([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                mode: 'pineapples'
            }, function(err, data) {
                expect(err).to.be.instanceOf(Error);

                expect(err).to.have.property('message')
                    .and.to.match(/^options.mode must be one of:/);

                done();
            });
        });
        
        it('errors if options.type is not a known value', function(done) {
            getReport([
                writeData(through(), DATA.test),
                writeData(through(), DATA.test)
            ], {
                mode: 'fastest',
                type: 'pineapples'
            }, function(err, data) {
                expect(err).to.be.instanceOf(Error);

                expect(err).to.have.property('message')
                    .and.to.match(/^options.type must be one of:/);

                done();
            });
        });
    });
});

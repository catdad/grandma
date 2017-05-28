/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-nested-callbacks, max-len */

var expect = require('chai').expect;
var through = require('through2');
var async = require('async');
var es = require('event-stream');
var _ = require('lodash');
var unstyle = require('unstyle');

var report = require('../').report;

var DATA = require('./data/testdata.js');
var expectations = require('./data/testexpectations.js');

function getReport(options, data, callback) {
    var cb = _.once(callback);
    
    var input = through();
    var output = through();

    var opts = _.defaults(options, {
        input: input,
        output: output
    });
    
    async.auto({
        report: function(next) {
            report(opts, next);
        },
        output: function(next) {
            // listen to output on the stream inside opts
            opts.output.pipe(es.wait(next));
        }
    }, function(err, result) {
        if (err) {
            return cb(err);
        }
        
        cb(null, result.output);
    });
    
    // write to original input, in case the user has decided
    // to overwrite the opt with their own
    input.end(data.map(JSON.stringify).join('\n'));
}

function testNoData(reporter) {
    it('errors if no data is written to the input stream', function(done) {
        getReport({
            type: reporter
        }, [], function(err, content) {
            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('message').and.to.equal('no data provided');

            done();
        });
    });
}

describe('[report]', function() {
    it('takes an input and output stream', function(done) {
        var input = through();
        
        getReport({
            input: input
        }, DATA.test, function(err, content) {
            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('message').and.to.equal('no data provided');
            
            done();
        });
        
        input.end();
    });
    
    it('reads data from the input stream', function(done) {
        var input = through();
        
        getReport({
            input: input,
            type: 'text'
        }, DATA.test, function(err, content) {
            expect(err).to.not.be.ok;
            
            expect(content).to.be.ok;
            expect(content.toString()).to.match(/Summary:/);
            expect(content.toString()).to.match(/Latencies:/);
            done();
        });
        
        input.end(DATA.test.map(JSON.stringify).join('\n'));
    });
    
    describe('merges header data', function() {
        
        var DURATION = 200;
        var RATE = 10;
        var TARGET_COUNT = 2000;
        
        var validHeader = {
            type: 'header',
            epoch: 1460127721611,
            duration: DURATION,
            rate: RATE,
            targetCount: TARGET_COUNT
        };
    
        function getMergedHeaders(one, two) {
            one = _.defaults(one, validHeader);
            two = _.defaults(two, validHeader);
            
            return report._mergeHeaderJson(one, two);
        }
        
        it('when given a smaller epoch first', function() {
            var header = getMergedHeaders({
                epoch: 2
            }, {
                epoch: 5
            });
            
            expect(header.epoch).to.equal(2);
            expect(header.duration).to.equal(DURATION + 3);
        });
        
        it('when given a larger epoch first', function() {
            var header = getMergedHeaders({
                epoch: 10
            }, {
                epoch: 6
            });
            
            expect(header.epoch).to.equal(6);
            expect(header.duration).to.equal(DURATION + 4);
        });
        
        it('when the two test runs overlap', function() {
            var header = getMergedHeaders({
                epoch: 2,
                duration: 100
            }, {
                epoch: 62,
                duration: 50
            });
            
            expect(header.epoch).to.equal(2);
            expect(header.duration).to.equal(110);
        });
        
        it('when the second test occurs entirely outside of the first', function() {
            var header = getMergedHeaders({
                epoch: 2,
                duration: 10
            }, {
                epoch: 20,
                duration: 20
            });
            
            expect(header.epoch).to.equal(2);
            expect(header.duration).to.equal(38);
        });

        it('returns all rate values in an array', function() {
            var header = getMergedHeaders({
                rate: 4
            }, {
                rate: 8
            });
            
            expect(header.rate).to.deep.equal([4, 8]);
        });
        
        it('returns all concurrent values in an array', function() {
            var header = getMergedHeaders({
                concurrent: 5
            }, {
                concurrent: 12
            });
            
            expect(header.concurrent).to.deep.equal([5, 12]);
        });
        
        it('adds all target counts', function() {
            var header = getMergedHeaders({
                targetCount: 100
            }, {
                targetCount: 42
            });
            
            expect(header.targetCount).to.equal(142);
        });
        
        it('uses the name from the original header value by default', function() {
            var NAME = 'the name';
            var header = getMergedHeaders({
                name: NAME
            }, {
                name: 'not the name'
            });
            
            expect(header).to.have.property('name').and.to.equal(NAME);
        });
        
        it('uses the name from the new header if one is not present in the first', function() {
            var NAME = 'the name';
            var header = getMergedHeaders({}, { name: NAME });
            
            expect(header).to.have.property('name').and.to.equal(NAME);
        });
        
        it('outputs name as null if one is not available', function() {
            var header = getMergedHeaders({}, {});
            
            expect(header).to.have.property('name').and.to.equal(null);
        });
        
        // have one test that actually goes through the proper system
        it('when read from the input stream', function(done) {
            var input = through();
            
            getReport({
                input: input,
                type: 'json'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                expect(jsonData).to.have.property('info').and.to.be.an('object');
                
                var header = jsonData.info;
                
                expect(header.targetCount).to.equal(90);
                expect(header.duration).to.equal(35);
                expect(header.rate).to.equal(1.5);
                
                done();
            });
            
            input.write(JSON.stringify({
                type: 'header',
                epoch: 10,
                duration: 30,
                rate: 1,
                targetCount: 30
            }) + '\n');
            input.write(JSON.stringify({
                type: 'header',
                epoch: 15,
                duration: 30,
                rate: 2,
                targetCount: 60
            }) + '\n');
            input.write(DATA.test.slice(1).map(JSON.stringify).join('\n'));
            input.end();
        });
    });
    
    describe('#json', function() {
        it('is the default reporter when type is not defined', function(done) {
            getReport({}, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                // match the ground-truthed json
                // not sure how fragile this test actually is
                expect(jsonData).to.deep.equal(DATA.results);
                
                done();
            });
        });
        
        it('provides readable json data for rate mode', function(done) {
            getReport({
                type: 'json'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                // match the ground-truthed json
                // not sure how fragile this test actually is
                expect(jsonData).to.deep.equal(DATA.results);
                
                done();
            });
        });
        
        it('provides readable json data for concurrent mode', function(done) {
            getReport({
                type: 'json'
            }, DATA.testerr, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                // match the ground-truthed json
                // not sure how fragile this test actually is
                expect(jsonData).to.deep.equal(DATA.resultserr);
                
                done();
            });
        });
        
        it('provides category output when present in the input', function(done) {
            getReport({
                type: 'json'
            }, DATA.testcategories, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                expect(jsonData).to.have.property('categories').and.to.be.an('object');
                
                var categories = jsonData.categories;
                var rootLatencies = jsonData.latencies;
                
                expect(categories).to.have.all.keys(['0', '1', '2']);
                
                _.forEach(function(category) {
                    expect(category).to.have.all.keys(['info', 'latencies']);
                    expect(category.info)
                        .to.be.an('object')
                        .and.to.have.all.keys(['count'])
                        .and.to.have.property('count')
                        .and.to.be.a('number')
                        .and.to.be.above(0);
                    
                    expect(category.latencies).to.have.all.keys(_.keys(rootLatencies));
                    
                    _.forEach(category.latencies, function(val, name) {
                        expect(val).to.have.all.keys(_.keys(rootLatencies[name]));
                    });
                });
                
                done();
            });
        });
        
        it('handles non-js name custom metrics', function(done) {
            getReport({
                type: 'json'
            }, DATA.test_funny_metrics, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var jsonData = JSON.parse(content.toString());
                
                expect(jsonData).to.be.an('object');
                
                done();
            });
        });
        
        it('provides an object as the second callback parameter when successful', function(done) {
            var input = through();
            var output = through();

            var opts = {
                input: input,
                output: output,
                type: 'json'
            };

            var streamContent;
            var jsonObj;
            
            function onDone() {
                if (!streamContent || !jsonObj) {
                    return;
                }
                
                expect(jsonObj).to.deep.equal(streamContent);
                
                done();
            }
            
            report(opts, function(err, obj) {
                if (err) {
                    throw err;
                }
                
                jsonObj = obj;
                onDone();
            });

            // listen to output on the stream inside opts
            opts.output.pipe(es.wait(function(err, content) {
                if (err) {
                    throw err;
                }
                
                streamContent = JSON.parse(content.toString());
                onDone();
            }));

            // write to original input, in case the user has decided
            // to overwrite the opt with their own
            input.end(DATA.test.map(JSON.stringify).join('\n'));
        });
        
        it('does not require an output stream', function(done) {
            var input = through();

            var opts = {
                input: input,
                type: 'json'
            };

            report(opts, function(err, obj) {
                if (err) {
                    return done(err);
                }
                
                expect(obj).to.be.an('object');
                done();
            });

            // write to original input, in case the user has decided
            // to overwrite the opt with their own
            input.end(DATA.test.map(JSON.stringify).join('\n'));
        });
        
        it('skips non-json lines', function(done) {
            var input = through();

            var opts = {
                input: input,
                type: 'json'
            };

            report(opts, function(err, obj) {
                if (err) {
                    return done(err);
                }
                
                expect(obj).to.be.an('object');
                done();
            });

            input.end(DATA.test.map(JSON.stringify).concat(['this is not json']).join('\n'));
        });
        
        it('errors if there is an error on the input stream', function(done) {
            var ERR = new Error('pineapples');
            var input = through();

            var opts = {
                input: input,
                type: 'json'
            };

            report(opts, function(err, obj) {
                expect(err).to.equal(ERR);
                expect(obj).to.equal(undefined);

                done();
            });
            
            input.write('thing');
            input.write('stuff');

            setImmediate(function() {
                input.emit('error', ERR);
            });
        });
        
        testNoData('json');
    });
    
    describe('#text', function() {
        
        
        it('provides pretty text data for rate mode', function(done) {
            getReport({
                type: 'text'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                expectations.text.test(str);
                
                done();
            });
        });
        
        it('provides pretty text data for concurrent mode', function(done) {
            getReport({
                type: 'text'
            }, DATA.testerr, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
               
                expectations.text.testerr(str);
                
                done();
            });
        });
        
        it('outputs latencies for categories', function(done) {
            getReport({
                type: 'text'
            }, DATA.testcategories, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
               
                var str = content.toString();
                
                expectations.text.testcategories(str);
                
                done();
            });
        });
        
        it('prints test status breakdowns', function(done) {
            getReport({
                type: 'text'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                expectations.text.test(str);
                
                done();
            });
        });
        
        it('does not print colors by default', function(done) {
            getReport({
                type: 'text'
            }, DATA.testcategories, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                expect(unstyle.string(str)).to.equal(str);
                
                done();
            });
        });
        
        it('can print the text report in color', function(done) {
            getReport({
                type: 'text',
                color: true
            }, DATA.testcategories, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                expect(unstyle.string(str)).to.not.equal(str);
                
                done();
            });
        });
        
        it('handles non-js name custom metrics', function(done) {
            getReport({
                type: 'text'
            }, DATA.test_funny_metrics, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                expect(content.toString()).to.be.a('string')
                    .and.to.have.length.above(100);
                
                done();
            });
        });
        
        testNoData('text');
    });

    describe('#plot', function() {
        it('provides an html page', function(done) {
            getReport({
                type: 'plot'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // what the hell do I test here?
                expect(str).to.match(/<html/);
                expect(str).to.match(/<\/html\>/);
                
                done();
            });
        });
        
        it('handles non-js name custom metrics', function(done) {
            getReport({
                type: 'plot'
            }, DATA.test_funny_metrics, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                expect(content.toString()).to.be.a('string')
                    .and.to.have.length.above(100);
                
                done();
            });
        });
        
        testNoData('plot');
    });
    
    describe('#html', function() {
        it('provides an html page', function(done) {
            getReport({
                type: 'html'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // what the hell do I test here?
                expect(str).to.match(/<html/);
                expect(str).to.match(/<\/html\>/);
                
                done();
            });
        });
        
        it('handles non-js name custom metrics', function(done) {
            getReport({
                type: 'html'
            }, DATA.test_funny_metrics, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                expect(content.toString()).to.be.a('string')
                    .and.to.have.length.above(100);
                
                done();
            });
        });
        
        testNoData('html');
    });
    
    describe('#box', function() {
        // Since we are using a lib for this, we really only need to test
        // the relevant parts, namely that it will read the input and
        // write the box plot to the output.
        
        function testWidth(content, width) {
            var str = content.toString();
            
            // the 3rd line is the one with the dashes
            var line = str.split('\n')[2];

            // Based on the content, the width may actualy be a bit
            // less than the set maximum, but it should never be
            // more than that.
            expect(line).to.have.property('length')
                .and.to.be.at.most(width)
                .and.to.be.at.least(width - 2);
        }
        
        it('generated a box plot in plain text', function(done) {
            getReport({
                type: 'box'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // grandma adds a new line after the original box plot,
                // so we should remove it here:
                var strArr = str.split('\n');
                expect(strArr).to.have.lengthOf(5);
                strArr.pop();
                
                expectations.box.isValid(strArr.join('\n'));
                
                done();
            });
        });
        
        it('is 75 characters wide by default', function(done) {
            getReport({
                type: 'box'
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                testWidth(content, 75);
                done();
            });
        });
        
        it('can have a custom width', function(done) {
            var WIDTH = 32;
            
            getReport({
                type: 'box',
                box: {
                    width: WIDTH
                }
            }, DATA.test, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                testWidth(content, 32);
                
                done();
            });
        });
        
        it('reports on categories if present', function(done) {
            getReport({
                type: 'box'
            }, DATA.testcategories, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                var str = content.toString();
                
                // grandma adds a new line after the original box plot,
                // so we should remove it here:
                var strArr = str.split('\n');
                // there are 3 categories, so 4 total box plots
                expect(strArr).to.have.lengthOf(5 * 4);
                strArr.pop();
                
                var plots = [];
                var size = 4;
                
                while (strArr.length) {
                    plots.push(strArr.splice(0, size));
                    
                    // throw away the next line
                    strArr.shift();
                }
                
                expect(plots).to.have.lengthOf(4);
                
                plots.forEach(function(arr) {
                    expectations.box.isValid(arr.join('\n'));
                });
                
                done();
            });
        });
        
        it('handles non-js name custom metrics', function(done) {
            getReport({
                type: 'box'
            }, DATA.test_funny_metrics, function(err, content) {
                expect(err).to.not.be.ok;
                expect(content).to.be.ok;
                
                expect(content.toString()).to.be.a('string')
                    .and.to.have.length.above(100);
                
                done();
            });
        });
        
        testNoData('box');
    });
    
    describe('errors when the reporter', function() {
        function getError(opts, errString, done) {
            report(opts, function(err) {
                expect(err).to.be.instanceof(Error);
                expect(err).to.have.property('message').and.to.equal(errString);
                done();
            });
        }
        
        it('does not receive an input stream', function(done) {
            getError({
                output: through()
            }, 'no readable input stream defined', done);
        });
        
        it('does not receive an output stream, for text report', function(done) {
            getError({
                input: through(),
                type: 'text'
            }, 'no writable output stream defined', done);
        });
        
        it('does not receive an output stream, for plot report', function(done) {
            getError({
                input: through(),
                type: 'plot'
            }, 'no writable output stream defined', done);
        });
        
        it('receives an invalid report type', function(done) {
            var type = Math.random().toString(36);
            getError({
                input: through(),
                output: through(),
                type: type
            }, type + ' is not a valid report type', done);
        });
        
        it('encounters a read error on the input stream', function(done) {
            var input = through();
            var ERROR = new Error('flapjacks');
            report({
                input: input,
                output: through()
            }, function(err) {
                expect(err).to.equal(ERROR);
                done();
            });
            
            input.emit('error', ERROR);
        });
        
    });
});

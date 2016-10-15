/* eslint-env mocha */

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');
var _ = require('lodash');
var unstyle = require('unstyle');

var DATA = require('./data/testdata.js');

var diff = require('../').diff;

function writeData(stream, data) {
    setTimeout(function() {
        stream.end(_.map(data, JSON.stringify).join('\n'));
    });
    
    return stream;
}

function getReport(streams, options, callback) {
    var cb = _.once(callback);
    
    var output = through();

    var opts = _.defaults(options, {
        output: output
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

describe.only('[diff]', function() {
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
});

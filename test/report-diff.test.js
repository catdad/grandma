/* eslint-env mocha */

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');
var _ = require('lodash');

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

describe('[diff]', function() {
    it('takes an array of input streams', function(done) {
        getReport([
            writeData(through(), DATA.test),
            writeData(through(), DATA.test)
        ], {}, function(err, data) {
            if (err) {
                return done(err);
            }
            
            data = data.toString();
            
            expect(data).to.be.a('string').and.to.have.length.above(1);
            
            done();
        });
    });
    
    it('takes an object hash of input streams');
    
    it('writes to an output stream');
});

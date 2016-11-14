/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-nested-callbacks, max-len */

var expect = require('chai').expect;

var grandma = require('./util-grandma.js');

var DATA = require('../data/testdata.js');
var expectations = require('../data/testexpectations.js');

function json(val) {
    return JSON.stringify(val);
}

function data(name) {
    return DATA[name || 'test'].map(json).join('\n');
}

describe('[report cli]', function() {
    describe('#default', function() {
        it('prints out text to standard out', function(done) {
            grandma('report', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout).to.be.a('string')
                    .and.to.have.length.above(1);
                
                expectations.text.test(stdout);
                
                done();
            });
        });
    });
    
    describe('#text', function() {
        it('prints out text to standard out', function(done) {
            grandma('report --type text', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout).to.be.a('string')
                    .and.to.have.length.above(1);
                
                expectations.text.test(stdout);

                done();
            });
        });
    });
    
    describe('#json', function() {
        it('prints out json to standard out', function(done) {
            grandma('report --type json', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout).to.be.a('string')
                    .and.to.have.length.above(1);
                
                var obj = JSON.parse(stdout);
                
                expect(obj).to.deep.equal(DATA.results);
                
                done();
            });
        });
    });
    
    describe('#plot', function() {
        it('prints out an html page to standard out', function(done) {
            grandma('report --type plot', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout.trim())
                    .to.match(/^\<\!DOCTYPE html\>/)
                    .and.to.match(/<html/)
                    .and.to.match(/\<\/html\>$/);
                
                expect(stderr).to.equal('');
                
                done();
            });
        });
    });
    
    describe('#box', function() {
        it('prints out a box plot to standard out');
    });
});

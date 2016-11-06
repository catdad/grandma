/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-nested-callbacks, max-len */

var path = require('path');
var util = require('util');

var expect = require('chai').expect;
var shellton = require('shellton');
var through = require('through2');
var root = require('rootrequire');

var DATA = require('../data/testdata.js');

function json(val) {
    return JSON.stringify(val);
}

function data(name) {
    return DATA[name || 'test'].map(json).join('\n');
}

function run(command, input, done) {
    var task = util.format('%s "%s" %s', 'node', path.join('bin', 'cli.js'), command);
    var stream = through();
    
    shellton({
        task: task,
        cwd: root,
        stdin: stream
    }, done);
    
    stream.write(input);
    stream.end();
}

describe('[report cli]', function() {
    describe('#default', function() {
        it('prints out text to standard out', function(done) {
            run('report', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout).to.be.a('string')
                    .and.to.have.length.above(1);
                
                done();
            });
        });
    });
    
    describe('#text', function() {
        it('prints out text to standard out', function(done) {
            run('report --type text', data(), function(err, stdout, stderr) {
                if (err) {
                    return done(err);
                }
                
                expect(stdout).to.be.a('string')
                    .and.to.have.length.above(1);
                
                done();
            });
        });
    });
    
    describe('#json', function() {
        it('prints out json to standard out', function(done) {
            run('report --type json', data(), function(err, stdout, stderr) {
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
        it('prints out an html page to standard out');
    });
    
    describe('#box', function() {
        it('prints out a box plot to standard out');
    });
});

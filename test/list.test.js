/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var list = require('../lib/list.js');

// this module is a bit silly, but yay tests

describe('[list]', function() {
    [
        // yes, I am running the same test twice, since it tests
        // for two different things... yay!
        'takes a tests array as an option',
        'calls the callback with an array of string names'
    ].forEach(function(testName) {
        it(testName, function(done) {
            var names = ['one', 'two', 'three'];
            var tests = names.map(function(name) {
                return { name: name };
            });

            list({ tests: tests }, function(err, data) {
                expect(err).to.not.be.ok;
                expect(data).to.deep.equal(names);

                done();
            });
        });    
    });
    
    it('errors if options.tests is not present', function(done) {
        list({}, function(err, data) {
            expect(err).to.be.instanceof(Error)
                .and.to.have.property('message')
                .and.to.equal('options.tests is not a valid array');
            
            expect(data).to.be.undefined;
            
            done();
        });
    });
    
    it('errors if options.tests is not an array', function(done) {
        list({ tests: 'junk' }, function(err, data) {
            expect(err).to.be.instanceof(Error)
                .and.to.have.property('message')
                .and.to.equal('options.tests is not a valid array');
            
            expect(data).to.be.undefined;
            
            done();
        });
    });
    
    it('is asynchronous', function(done) {
        var test = false;
        
        list({ tests: [{ name: 'pineapple' }] }, function(err, data) {
            expect(err).to.not.be.ok;
            expect(data).to.be.an('array');
            
            expect(test).to.equal(true);

            done();
        });
        
        test = true;
    });
    
    it('is asynchronous when it errors', function(done) {
        var test = false;
        
        list({}, function(err, data) {
            expect(err).to.be.instanceof(Error);
            expect(data).to.be.undefined;
            
            expect(test).to.equal(true);
            
            done();
        });
        
        test = true;
    });
    
});

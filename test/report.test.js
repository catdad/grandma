/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var through = require('through2');
var es = require('event-stream');

var report = require('../lib/report.js');

var TESTDATA = [
    {"type":"header","epoch":1460127721611,"duration":30000,"rate":20,"targetCount":600},
    {"type":"report","report":{"fullTest":{"start":0,"end":19.801774,"duration":19.801774,"status":"success"},"one":{"start":0.14821399999999585,"end":2.897864999999996,"duration":2.749651,"status":"success"},"two":{"start":0.45399899999999604,"end":6.853753000000005,"duration":6.399754000000009,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":47.191123999999995,"end":61.882996999999996,"duration":14.691873000000001,"status":"success"},"one":{"start":47.213159999999995,"end":49.951642,"duration":2.7384820000000047,"status":"success"},"two":{"start":47.56996,"end":51.722057,"duration":4.152096999999998,"status":"success"}},"id":0},
    {"type":"report","report":{"fullTest":{"start":97.46002200000001,"end":111.861504,"duration":14.401481999999987,"status":"success"},"one":{"start":97.46877600000002,"end":99.933471,"duration":2.4646949999999777,"status":"success"},"two":{"start":97.493529,"end":101.74916300000001,"duration":4.255634000000015,"status":"success"}},"id":0},
];

describe('[report]', function() {
    it('takes an input and output stream', function(done) {
        var input = through();
        var output = through();
        
        report({
            input: input,
            output: output
        }, function(err) {
            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('message').and.to.equal('no data provided');
            
            done();
        });
        
        input.end();
    });
    it('reads data from the input stream', function(done) {
        var input = through();
        var output = through();
        
        report({
            input: input,
            output: output
        }, function(err) {
            expect(err).to.not.be.ok;
            
            done();
        });
        
        output.pipe(es.wait(function(err, content) {
            expect(err).to.not.be.ok;
            
            expect(content).to.be.ok;
            expect(content.toString()).to.match(/Summary:/);
            expect(content.toString()).to.match(/Latencies:/);
        }));
        
        input.end(TESTDATA.map(JSON.stringify).join('\n'));
    });
    it('writes results to the output stream');
    
    describe('#json', function() {
        it('provides readable json data');
    });
    describe('#text', function() {
        it('provides pretty text data');
    });
    describe('#plot', function() {
        it('provides an html page');
    });
});

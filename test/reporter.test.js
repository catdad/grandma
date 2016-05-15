/* jshint node: true, mocha: true, expr: true */

var expect = require('chai').expect;
var Reporter = require('../lib/reporter.js');

describe('[reporter]', function() {
    it('returns the data object that is passed in', function() {
        var VAL = {};
        var val = Reporter(null, VAL);

        expect(val).to.equal(VAL);
    });
    it('writes a status value of "success" by default', function() {
        var val = Reporter(null, {});
        
        expect(val).to.have.property('status').and.to.equal('success');
    });
    it('writes a status value of "failure" if an error is passed in', function() {
        var val = Reporter(true, {});
        
        expect(val).to.have.property('status').and.to.equal('failure');
    });
    it('uses the value of "errorCode" on the error to determine an error code', function() {
        var ERROR_CODE = 'plants';
        var val = Reporter({ errorCode: ERROR_CODE }, {});
        
        expect(val).to.have.property('errorCode').and.to.equal(ERROR_CODE);
    });
});

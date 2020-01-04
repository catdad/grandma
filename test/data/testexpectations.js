/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-nested-callbacks, max-len, no-useless-escape */

var expect = require('chai').expect;

var testdata = require('./testdata.js');

function tableRegex() {
    var str = [].slice.call(arguments).join('\\s+?');
    return new RegExp(str);
}

var text = {
    test: function(str) {
        // regular expressions to match the ground-truthed results
        // not sure how fragile this test actually is
        expect(str).to.match(tableRegex('Summary:', 'duration', 'rate', 'concurrent', 'total'));
        expect(str).to.match(tableRegex('30s', '20', 'null', '3'));

        expect(str).to.match(tableRegex('Latencies:', 'mean', '50', '95', '99', 'max'));
        expect(str).to.match(tableRegex('fullTest', '16.298ms', '14.692ms', '19.802ms', '19.802ms', '19.802ms'));
        expect(str).to.match(tableRegex('one', '2.651ms', '2.738ms', '2.750ms', '2.750ms', '2.750ms'));
        expect(str).to.match(tableRegex('two', '4.936ms', '4.256ms', '6.400ms', '6.400ms', '6.400ms'));

        expect(str).to.match(tableRegex('Successes:', '3'));
        expect(str).to.match(tableRegex('Failures:', '0'));
    },
    testerr: function(str) {
        // regular expressions to match the ground-truthed results
        // not sure how fragile this test actually is

        // We will only test the info that is different from DATA.test
        // data set
        expect(str).to.match(tableRegex('Summary:', 'duration', 'rate', 'concurrent', 'total'));
        expect(str).to.match(tableRegex('120ms', 'null', '3', '7'));

        expect(str).to.match(tableRegex('Successes:', '1'));
        expect(str).to.match(tableRegex('Failure code 123:', '3'));
        expect(str).to.match(tableRegex('Failure code 456:', '2'));
        expect(str).to.match(tableRegex('Failure code 789:', '1'));
    },
    testcategories: function(str) {
        expect(str).to.match(tableRegex('Summary:', 'duration', 'rate', 'concurrent', 'total'));
        expect(str).to.match(/Category: 0/);
        expect(str).to.match(/Category: 1/);
        expect(str).to.match(/Category: 2/);

        // test that fullTest is reported multiple times
        expect(str.match(/fullTest/g)).to.have.lengthOf(4);
        expect(str.match(/one/g)).to.have.lengthOf(4);
        expect(str.match(/two/g)).to.have.lengthOf(4);
    }
};

var box = {
    test: function(str) {
        return box.isValid(str);
    },
    isValid: function(str) {
        expect(str).to.be.a('string');

        var strArr = str.split('\n');

        expect(strArr).to.have.lengthOf(4);

        var str0 = strArr[0];
        var str1 = strArr[1];
        var str2 = strArr[2];
        var str3 = strArr[3];

        expect(str0).to.match(/(^Full Test:$)|(^Category:)/);

        expect(str1).to.match(/^\s{1,}\+\-{0,}\+\-{0,}\+\s{1,}$/);
        expect(str2).to.match(/^\|\-{0,}\|\s{0,}\|\s{0,}\|\-{0,}\|\s{0,}$/);

        // the top and bottom of the box plot are the same string
        expect(str3).to.equal(str1);
    }
};

var html = {
    test: function(str) {
        return html.isValid(str);
    },
    testerr: function(str) {
        return html.isValid(str);
    },
    testcategories: function(str) {
        return html.isValid(str);
    },
    isValid: function(str) {
        expect(str).to.be.a('string');
        expect(str).to.match(/^<\!DOCTYPE html>/).and.to.match(/<\/html>$/);
    }
};

var json = {
    isValid: function(str) {
        expect(str).to.be.a('string');

        return JSON.parse(str);
    },
    test: function(str) {
        var data = json.isValid(str);
        expect(data).to.deep.equal(testdata.results);
    },
    testerr: function(str) {
        var data = json.isValid(str);
        expect(data).to.deep.equal(testdata.results);
    }
};

module.exports = {
    text: text,
    box: box,
    html: html,
    plot: html,
    json: json
};

Object.defineProperty(module.exports, 'tableRegex', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: tableRegex
});

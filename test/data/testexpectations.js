/* eslint-env mocha */
/* eslint-disable no-unused-expressions, max-nested-callbacks, max-len */
var expect = require('chai').expect;

function tableRegex() {
    var str = [].slice.call(arguments).join('\\s+?');
    return new RegExp(str);
}

module.exports = {
    text: {
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
    }
};

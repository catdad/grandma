var sinon = require('sinon');

module.export = function timeTest(testFunc) {
    
    return function mochaFunction(mochaDone) {
        var clock = sinon.useFakeTimers(Date.now());

        testFunc(clock, function(err) {
            clock.restore();
            
            mochaDone(err);
        });
    };
};

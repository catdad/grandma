/* jshint node: true */

var util = require('util');

var _ = require('lodash');
var async = require('async');

var argv = require('yargs').argv;
var workerId = argv.worker;

var now = require('./now');
var enums = require('./enums');

var reporter = (function() {
    function ensureObj(obj) {
        return _.isPlainObject(obj) ? obj : {};
    }
    
    function sendMessage(obj) {
        if (typeof obj === 'number') {
            return process.send(obj);
        }
        
        obj = ensureObj(obj);
        obj = _.merge({}, obj, {
            id: workerId
        });
        
        process.send(obj);
    }
    
    return {
        error: function(err) {
            var obj = {
                type: 'error',
                message: err.message,
                stack: err.stack,
                error: err
            };
            sendMessage(obj);
        },
        tick: function(obj) {
            sendMessage(enums.message.tick);
        },
        ready: function() {
            sendMessage(enums.message.ready);
        },
        report: function(obj) {
            obj = ensureObj(obj);
            obj.type = 'report';
            sendMessage(obj);
        }
    };
})();

function decorateTest(testFunc) {
    return function(done) {
        var start = now();
        var end;

        testFunc(function(err) {
            end = now();

            reporter.report({
                start: start,
                end: end,
                duration: (end - start)
            });
            
            done(err);
        });
    };
}

var testInstance;

function TestRunner(filepath) {
    var test;
    
    try {
        test = require(filepath);
    } catch(e) {
        reporter.error(e);
    }
    
    function runTest() {
        var context = {};
        var series = [];
        
        if (test.beforeEach) {
            series.push(test.beforeEach.bind(context));
        }
        
        series.push(decorateTest(test.test.bind(context)));
        
        if (test.afterEach) {
            series.push(test.afterEach.bind(context));
        }
        
        async.series(series, function() {
            reporter.tick();
        });
    }
    
    return {
        run: runTest
    };
}

function alreadyInitializedError() {
    var err = util.format('worker %s already initialized', workerId);
    reporter.error(new Error(err));
}

function notInitializedError() {
    var err = util.format('worker %s is not initialized', workerId);
    reporter.error(new Error(err));
}

process.on('message', function(msg) {
    switch(msg.command) {
        case 'init':
            if (!testInstance) {
                testInstance = TestRunner(msg.filepath);
                reporter.ready();
            } else {
                alreadyInitializedError();
            }
            break;
        case 'run':
            if (testInstance) {
                testInstance.run();
            } else {
                notInitializedError();
            }
            break;
        default:
            reporter.error(new Error('unknown command: ' + msg.command));
    }
});

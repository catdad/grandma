/* eslint-env mocha */

var expect = require('chai').expect;
var _ = require('lodash');

var Logger = require('../lib/logger.js');

function mockStream(onWrite) {
    return {
        write: onWrite
    };
}

describe('[logger]', function() {
    
    function testLoggingMethod(options) {
        var name = options.name;
        var streamName = options.streamName;
        var optName = options.optName;
        var envName = options.envName;
        
        var description = options.description || ('#' + name);
        
        describe(description, function() {
            function testLog(opts, args, expectedData) {
                var stream = mockStream(function(data) {
                    expect(data).to.equal(expectedData + '\n');
                });
                
                var testOpts = {};
                testOpts[streamName] = stream;

                opts = _.defaultsDeep(opts, testOpts);

                var logger = Logger(opts);
                logger[name].apply(logger, args);
            }
            
            it('writes to stdout alternate stream', function() {
                var DATA = 'monkeys';
                
                var opts = {};
                opts[optName] = true;

                testLog(opts, [DATA], DATA);
            });
            
            it('formats strings', function() {
                var DATA = 'monkeys';

                var opts = {};
                opts[optName] = true;
                
                testLog(opts, ['not %s', DATA], 'not ' + DATA);
            });

            it('can be enabled with an env variable', function() {
                var DATA = 'monkeys';

                process.env[envName] = 1;

                testLog({}, [DATA], DATA);

                delete process.env[envName];
            });

            it('can be enabled with the "debug" flag without the specific level flag', function() {
                var DATA = 'monkeys';
                
                var opts = {
                    debug: true
                };

                testLog(opts, [DATA], DATA);
            });

            it('queues writes synchronously', function() {
                var wrote = false;

                var stream = mockStream(function() {
                    wrote = true;
                });

                var opts = {};
                opts[optName] = true;
                opts[streamName] = stream;
                
                var logger = Logger(opts);

                expect(wrote).to.equal(false);
                logger[name]('flapjacks');
                expect(wrote).to.equal(true);
            });

            it('does not write when not enabled', function() {
                var stream = mockStream(function() {
                    throw new Error('should not write to stream');
                });

                var opts = {};
                opts[streamName] = stream;
                
                var logger = Logger(opts);

                logger[name]('flapjacks');
            });
            
        });
        
    }
    
    testLoggingMethod({
        name: 'log',
        streamName: 'stdout',
        optName: 'debugLog',
        envName: 'GRANDMA_DEBUG_LOG'
    });
    
    testLoggingMethod({
        name: 'error',
        streamName: 'stderr',
        optName: 'debugError',
        envName: 'GRANDMA_DEBUG_ERROR'
    });
    
});

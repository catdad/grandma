/* eslint-disable no-console */

var path = require('path');
var util = require('util');
var through = require('through2');

var grandma = require('../');

function writer(name) {
    return function() {
        var str = util.format.apply(util, arguments);
        str = '[' + name + '] ' + str;
        
        console.log(str);
    };
}

function runTest(onData, onEnd, done) {
    var output = through.obj();

    var task = grandma.run({
        duration: '30s',
        rate: 2,
        output: output,
        test: {
            path: path.resolve(__dirname, '../fixtures/full.js'),
            name: 'mytest'
        }
    }, done);
    
    output.on('data', onData);
    output.on('end', onEnd);
    
    return task;
}

(function regularRun() {
    var start = Date.now();
    var reportCount = 0;
    var write = writer('  regular  ');
    
    runTest(function onData() {
        reportCount += 1;
    }, function onEnd() {
        write(
            'output end with %s reports in %s milliseconds',
            reportCount,
            Date.now() - start
        );
    }, function done() {
        write(
            'regular finished in %s ms with %s reports',
            Date.now() - start,
            reportCount
        );
    });
}());

(function interactiveRun() {
    var start = Date.now();
    var reportCount = 0;
    var write = writer('interactive');
    
    var task = runTest(function onData() {
        reportCount += 1;

        // increase rate by 2 at every 300 reports
        if (reportCount % 10 === 0) {
            task.rate += 2;

            write(
                'increased rate to %s at %s ms',
                task.rate,
                Date.now() - start
            );
        }
    }, function onEnd() {
        write(
            'output end with %s reports in %s milliseconds',
            reportCount,
            Date.now() - start
        );
    }, function done() {
        write(
            'interactive finishd in %s ms with %s reports',
            Date.now() - start,
            reportCount
        );
    });
}());

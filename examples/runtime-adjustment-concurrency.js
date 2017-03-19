/* eslint-disable no-console */

var path = require('path');
var through = require('through2');

var grandma = require('../');

var output = through.obj();

var start = Date.now();

var task = grandma.run({
    duration: '30s',
    concurrent: 2,
    output: output,
    test: {
        path: path.resolve(__dirname, '../fixtures/full.js'),
        name: 'mytest'
    }
}, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log('done callback');
        console.log('args', arguments);
        console.log('finishd in', Date.now() - start);
    }
});

var reportCount = 0;

output.on('data', function(obj) {
    reportCount += 1;
    
    // increase concurrency by 2 at every 300 reports
    if (reportCount % 300 === 0) {
        task.concurrent += 2;
        
        console.log(
            'increased concurrency to %s at %s ms',
            task.concurrent,
            Date.now() - start
        );
    }
});

output.on('end', function() {
    console.log(
        'output end with %s reports in %s milliseconds',
        reportCount,
        Date.now() - start
    );
});

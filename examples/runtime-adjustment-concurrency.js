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
    console.log('done callback');
    console.log('args', arguments);
    console.log('finishd in', Date.now() - start);
});

setTimeout(function() {
    var n = 10;
    
    console.log(
        'increasing concurrency from %s to %s, at %s reports',
        task.concurrent,
        n,
        reportCount
    );
    
    task.concurrent = n;
}, 15 * 1000);

console.log('task object:\n', task);

var reportCount = 0;

output.on('data', function(obj) {
    reportCount += 1;
});

output.on('end', function() {
    console.log('output end with %s reports', reportCount);
});

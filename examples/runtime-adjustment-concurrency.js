/* eslint-disable no-console */

var path = require('path');
var through = require('through2');

var grandma = require('../');

var output = through.obj();

var task = grandma.run({
    duration: '1m',
    concurrent: 2,
    output: output,
    test: {
        path: path.resolve(__dirname, '../fixtures/full.js'),
        name: 'mytest'
    }
}, function(err) {
    console.log('done callback');
    console.log(arguments);
});

console.log(task);

var reportCount = 0;

output.on('data', function(obj) {
    reportCount += 1;
});

output.on('end', function() {
    console.log('output end with %s reports', reportCount);
});

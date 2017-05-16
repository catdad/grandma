/* eslint-disable no-console */

var path = require('path');
var fs = require('fs');

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

output.pipe(through.obj(function onData(obj, enc, cb) {
    reportCount += 1;
    
    // the first object will be the header, which does not
    // have categories
    if (Array.isArray(obj.categories)) {
        obj.categories.push('concurrency-group-' + task.concurrent);
    }
    
    // increase concurrency by 2 at every 300 reports
    if (reportCount % 300 === 0) {
        task.concurrent += 2;
        
        console.log(
            'increased concurrency to %s at %s ms',
            task.concurrent,
            Date.now() - start
        );
    }
    
    // serialize the objects so that we can write to a
    // grandma log file
    cb(null, JSON.stringify(obj) + '\n');
}, function onFlush(cb) {
    console.log(
        'output end with %s reports in %s milliseconds',
        reportCount,
        Date.now() - start
    );
    
    cb();
})).pipe(fs.createWriteStream(
    path.resolve('.', 'runtime-adjustment-custom-tag.log')
));

/* eslint-disable no-console */

var util = require('util');
var path = require('path');
var fs = require('fs');

var through = require('through2');

var grandma = require('../');

var output = through.obj();
var start = Date.now();

function log(msg) {
    console.log(msg, util.format('at %s ms', Date.now() - start));
}

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
        log('done callback');
    }
});

var reportCount = 0;

output.pipe(through.obj(function onData(obj, enc, cb) {
    if (reportCount === 0) {
        log('first message received');
    }
    
    reportCount += 1;
    
    // the first object will be the header, which does not
    // have categories
    if (Array.isArray(obj.categories)) {
        obj.categories.push('concurrency-group-' + task.concurrent);
    }
    
    // some arbitrary logic...
    // increase concurrency by 2 at every 300 reports
    if (reportCount % 300 === 0) {
        task.concurrent += 2;
        
        log(util.format('increased concurrency to %s', task.concurrent));
    }
    
    // serialize the objects so that we can write to a
    // grandma log file
    cb(null, JSON.stringify(obj) + '\n');
}, function onFlush(cb) {
    console.log(util.format('output end with %s reports', reportCount));
    
    cb();
})).pipe(fs.createWriteStream(
    // write out to a file, so that we can use grandma to create
    // reports
    path.resolve('.', 'runtime-adjustment-custom-tag.log')
));

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
    // set a really long time, so we can control
    // this manually
    duration: '1d',
    concurrent: 2,
    output: output,
    test: {
        path: path.resolve(__dirname, '../fixtures/full.js'),
        name: 'runtime adjustment custom tags'
    }
}, function(err) {
    if (err) {
        console.log(err);
    } else {
        log('done callback');
    }
});

var reportCount = 0;

function startRound(count) {
    if (count === 0) {
        task.stop();
        return;
    }
    
    // each round will be 10 seconds
    setTimeout(function() {
        log('pausing');
        task.pause();
        
        // take a break... this theoretically allows
        // a server to get to an idle state again... or
        // some similar logic you may want
        setTimeout(function() {
            // double the rate each round
            task.concurrent *= 2;
            
            log(util.format('resuming at %s concurrency', task.concurrent));
            
            startRound(count - 1);

            task.resume();
        }, 1000 * 5);
        
    }, 1000 * 10);
}

startRound(5);

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

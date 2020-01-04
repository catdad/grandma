/* eslint-disable no-console */

var fs = require('fs');
var path = require('path');

var root = require('rootrequire');
var argv = require('yargs')
    .option('file', { type: 'string' })
    .option('out', { type: 'string' })
    .argv;

// require the module index
var grandma = require('../../');

var testfile = path.resolve(root, argv.file);
var out = argv.out ? fs.createWriteStream(path.resolve(root, argv.out)) : process.stdout;

grandma.run({
    test: {
        name: 'Test',
        path: testfile
    },
    duration: '20ms',
    concurrent: 1,
    output: out
}, function(err) {
    if (err) {
        console.error(err);
    } else {
        console.log('done');
    }
});

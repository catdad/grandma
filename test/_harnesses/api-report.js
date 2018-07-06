/* eslint-disable no-console */

var fs = require('fs');
var path = require('path');

var root = require('rootrequire');
var argv = require('yargs')
.option('in', { type: 'string' })
.option('out', { type: 'string' })
.options('type', { type: 'string' })
.argv;

// require the module index
var grandma = require('../../');

var instream = argv.in ? fs.createReadStream(path.resolve(root, argv.in)) : process.stdin;
var outstream = argv.out ? fs.createWriteStream(path.resolve(root, argv.out)) : process.stdout;

grandma.report({
    type: argv.type,
    input: instream,
    output: outstream
}, function(err) {
    if (err) {
        console.error(err);
    } else {
        console.log('done');
    }
});

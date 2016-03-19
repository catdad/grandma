/* jshint node: true */

var fs = require('fs');
var path = require('path');

var argv = require('yargs').argv;

var bench = require('../index');

var OPTS_PATH = argv.opts ? 
    path.resolve(argv.opts) :
    path.resolve('test', 'bench.opts');

function getOptions() {
    var opts;
    
    try {
        opts = fs.readFileSync(OPTS_PATH, 'utf8');
    } catch(e) {
        console.error('No options found at %s', OPTS_PATH);
        process.exit(1);
    }
    
    console.log(opts);
    return opts;
}

function getAllTestFiles() {
    
}

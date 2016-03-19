/* jshint node: true */

var fs = require('fs');
var path = require('path');

var argv = require('yargs').argv;
var _ = require('lodash');
var glob = require('glob');

var bench = require('../index');

var OPTS_PATH = argv.opts ? 
    path.resolve(argv.opts) :
    path.resolve('test', 'grandma.opts');

var grandma = require('../index');

function resolveArgs(opts) {
    opts = _.merge({
        directory: path.resolve('test'),
        threads: 1
    }, opts, {
        directory: argv.directory,
        rate: argv.rate,
        duration: argv.duration,
        threads: argv.threads
    });
    
    return opts;
}

function getOptions() {
    var opts;
    
    try {
        opts = fs.readFileSync(OPTS_PATH, 'utf8');
    } catch(e) {
        opts = {};
    }
    
    opts = resolveArgs(opts);
    
    return opts;
}

function getAllTestFiles() {
    var opts = getOptions();
    
    var globPattern = path.resolve(opts.directory, '**/*.js');
    
    glob(globPattern, {
        ignore: ['node_modules']
    }, function(err, files) {
        if (err) {
            console.error('Encountered an error: %s\n%s', err.message, err.stack);
            process.exit(1);
        }
        
        opts.tests = files.map(function(filepath) {
            return {
                path: filepath,
                name: path.basename(filepath, '.js')
            };   
        });
        
        function onDone(err) {
            if (err) {
                process.stderr.write(err.message + '\n\n');
                process.exit(1);    
            }
            
            process.exit(0);
        }
        
        grandma(opts, onDone);
    });
}

getAllTestFiles();

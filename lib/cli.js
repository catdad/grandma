/* jshint node: true */

var fs = require('fs');
var path = require('path');
var util = require('util');

var argv = require('yargs').argv;
var _ = require('lodash');
var glob = require('glob');

var bench = require('../index');

var OPTS_PATH = argv.opts ? 
    path.resolve(argv.opts) :
    path.resolve('test', 'grandma.opts');

var grandma = require('../index');

function exitWithError(msg) {
    process.stderr.write(msg + '\n\n');
    process.exit(1);            
}

function resolveArgs(opts) {
    opts = _.merge({
        directory: path.resolve('test'),
        threads: 1
    }, opts, {
        directory: argv.directory,
        rate: argv.rate,
        duration: argv.duration,
        threads: argv.threads,
        out: argv.out
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

function loadTests(opts, callback) {
    var globPattern = path.resolve(opts.directory, '**/*.js');
    
    glob(globPattern, {
        ignore: ['node_modules']
    }, function(err, files) {
        if (err) {
            console.error('Encountered an error: %s\n%s', err.message, err.stack);
            process.exit(1);
        }
        
        if (files.length === 0) {
            return exitWithError(util.format(
                'No tests found.\n%s %s', 
                'Try setting the directory or make sure there are tests in',
                opts.directory
            ));
        }
        
        opts.tests = files.map(function(filepath) {
            return {
                path: filepath,
                name: path.basename(filepath, '.js')
            };   
        });
        
        callback(err);
    });
}

function init(callback) {
    var opts = getOptions();
    
    loadTests(opts, function(err) {
        callback(err, opts);
    });
}

function initWithErrors(callback) {
    init(function(err, opts) {
        if (err) {
            return exitWithError(err.message);
        }
            
        callback(opts);
    });
}

function onDone(err) {
    if (err) {
        return exitWithError(err.message);   
    }

    process.exit(0);
}

function run() {
    initWithErrors(function(opts) {
        grandma.run(opts, onDone);
    });
}

function list() {
    initWithErrors(function(opts) {
        grandma.list(opts, onDone);
    });
}

function runCommand() {
    var command = argv._[0];
    
    var commands = ['run', 'report', 'list'];
    var errorMsg = 'Available commands: ' + commands.join(', ');
    
    if (command === undefined) {
        return exitWithError('command is not defined\n' + errorMsg);
    }
    
    switch(command) {
        case 'run':
            run();
            break;
        case 'report':
            console.log(command, 'not yet supported');
            break;
        case 'list':
            list();
            break;
        default:
            exitWithError('command "' + command + '" is not known\n' + errorMsg);
    }
}

runCommand();

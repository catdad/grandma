#!/usr/bin/env node
/* jshint node: true */

var NAME = 'grandma';

var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('lodash');
var glob = require('glob');
var rc = require('rc');

var yargs = require('yargs');
var argv = yargs
    .usage('\ngrandma <command> [options]')
    .alias('duration', 'd')
    .alias('rate', 'r')
    .alias('help', 'h')
    
    .command('list', 'List all available test names.')
    .command('run <testname>', 'Run a test by name.', function(yargs) {
        return yargs
            .demand(2, ['duration', 'rate'], 'Example: --duration=10m --rate=50');
    })
    .command('report <glob>', 'Summarize the content of report files.')
    .command('help', 'Print this help message.')
    
    .describe('duration', 'The time for which the test will run.')
    .describe('rate', 'The rate of the tests, in n per second.')
    
    .help()
    .version()
    .argv;

var bench = require('../index');

var OPTS_PATH = argv.opts ? 
    path.resolve(argv.opts) :
    path.resolve('test', 'grandma.opts');

var grandma = require('../index');

function exitWithError(msg) {
    process.stderr.write(msg + '\n\n');
    process.exit(1);            
}

function getOptions() {
    var opts = rc('grandma', {
        directory: argv.directory,
        rate: argv.rate,
        duration: argv.duration,
        threads: argv.threads || 1,
        out: argv.out,
//        zip: argv.nozip ? false : true
    });
    
    return opts;
}

function noTestsFoundErr(directory) {
    return exitWithError(util.format(
        '\n%s\n%s',
        'No tests found.',
        directory ?
            'Try setting the directory or make sure there are tests in ' + directory + '.' : 
            'Try setting the directory.'
    ));
}

function loadTests(opts, callback) {
    if (!_.isString(opts.directory)) {
        return noTestsFoundErr();
    }
    
    var globPattern = path.resolve(opts.directory, '**/*.js');
    
    glob(globPattern, {
        ignore: ['node_modules']
    }, function(err, files) {
        if (err) {
            console.error('Encountered an error: %s\n%s', err.message, err.stack);
            process.exit(1);
        }
        
        if (files.length === 0) {
            return noTestsFoundErr(opts.directory);
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

function getDestinationStream(opts) {
    var output = process.stdout;
    
    if (_.isString(opts.out) && opts.out !== 'stdout') {
        output = fs.createWriteStream(path.resolve('.', opts.out));
    }
    
    return output;
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

function onDone(err, data) {
    if (err) {
        return exitWithError(err.message);   
    }

    if (data && _.isString(data)) {
        process.stdout.write(data);
    }
    
    process.exit(0);
}

function run() {
    var testFilter = argv._[1];
    
    if (!testFilter) {
        return exitWithError(util.format(
            '\n%s\n%s',
            'No test name specified. Try specifying a name:',
            'grandma run <testname>'
        ));
    }
    
    initWithErrors(function(opts) {
        opts.output = getDestinationStream(opts);
        
        opts.tests = _.filter(opts.tests, function(test) {
            return test.name === testFilter;
        });
        
        grandma.run(opts, onDone);
    });
}

function list() {
    // :)
    function leftPad(v) {
        return '  ' + v;
    }
    
    initWithErrors(function(opts) {
        grandma.list(opts, function(err, list) {
            if (err) {
                return onDone(err.message);
            }
            
            var str = util.format(
                '\n%s\n\n%s\n\n%s\n',
                'The following tests are available:',
                list.map(leftPad).join('\n'),
                'Run as: grandma run <testname> [options]'
            );
            
            onDone(undefined, str);
        });
    });
}

function help() {
    yargs.showHelp();
    onDone(undefined, '');
}

function report() {
    var glob = argv._[1];
    var opts = getOptions();
    opts.glob = glob;
    
    opts.output = getDestinationStream(opts);
    
    grandma.report(opts, onDone);
}

function runCommand() {
    var command = argv._[0] || 'help';
    
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
            report();
            break;
        case 'list':
            list();
            break;
        case 'help':
            help();
            break;
        default:
            exitWithError('command "' + command + '" is not known\n' + errorMsg);
    }
}

runCommand();

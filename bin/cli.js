#!/usr/bin/env node

var NAME = 'grandma';

var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('lodash');
var glob = require('glob');
var rc = require('rc');
var globfile = require('glob-filestream');
var ensureGunzip = require('ensure-gunzip');
var mkdirp = require('mkdirp');

var grandma = require('../index');
var ttyHelper = require('../lib/tty-helper.js');
var argv = {};

process.title = NAME;

function exitWithError(msg) {
    process.stderr.write(msg + '\n\n');
    process.exit(1);
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
            process.stderr.on('drain', function() {
                process.exit(1);
            });
            process.stderr.write(
                util.format('Encountered an error: %s\n%s\n', err.message, err.stack)
            );
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
        var fullPath = path.resolve('.', opts.out);
        var rootPath = path.dirname(fullPath);
        
        // this is a cli, so fuck it
        mkdirp.sync(rootPath);
            
        output = fs.createWriteStream(fullPath);
    }
    
    return output;
}

function getInputStream(pattern) {
    var input = process.stdin;
    
    if (pattern !== 'stdin') {
        input = globfile(pattern, {
            transform: ensureGunzip
        });
    }
    
    return input;
}

function init(callback) {
    var opts = _.clone(argv);
    
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

var commands = {
    run: function run() {
        var testFilter = argv.testname || argv._[1];

        if (!testFilter) {
            return exitWithError(util.format(
                '\n%s\n%s',
                'No test name specified. Try specifying a name:',
                'grandma run <testname>'
            ));
        }
        
        if (!argv.rate && !argv.concurrent) {
            return exitWithError(util.format(
                '\n%s\n%s',
                'Either --rate or --concurrent must be specified. See for more help:',
                'grandma run --help'
            ));
        }

        initWithErrors(function(opts) {
            opts.output = getDestinationStream(opts);

            var test = _.find(opts.tests, function(t) {
                return t.name === testFilter;
            });
            
            if (!test) {
                return exitWithError(util.format(
                    '\n"%s" %s\n%s',
                    testFilter, 'is not a known test. To see a list of tests, run:',
                    'grandma list'
                ));
            }

            opts.test = test;
            
            grandma.run(opts, onDone);
        });
    },
    list: function list() {
        // :)
        function leftPad(v) {
            return '  ' + v;
        }

        initWithErrors(function(opts) {
            
            var testList = opts.tests.map(function(t) {
                return leftPad(t.name);
            });
            
            var str = util.format(
                '\n%s\n\n%s\n\n%s\n',
                'The following tests are available:',
                testList.join('\n'),
                'Run as: grandma run <testname> [options]'
            );

            onDone(undefined, str);
        });
    },
    report: function report() {
        var pattern = argv.glob || argv._[1];

        if (!pattern) {
            pattern = 'stdin';
        }

        var opts = _.clone(argv);
        
        opts.box = {
            width: ttyHelper.width
        };

        opts.input = getInputStream(pattern);
        opts.output = getDestinationStream(opts);
        
        // the default type for the CLI is text
        opts.type = opts.type || 'text';

        grandma.report(opts, onDone);
    },
    help: function help() {
        argv._yargs.showHelp();
        onDone(undefined, '');
    }
};

function loadConfig() {
    var opts = rc('grandma');
    
    // clean unwanted values that are added by rc
    var clone = _.cloneDeep(opts);
    delete clone.config;
    delete clone.configs;
    
    argv = require('../lib/argv.js')(clone);
    return argv;
}

function runCommand() {
    var command = argv._[0] || 'help';
    
    var commandList = ['run', 'report', 'list'];
    var errorMsg = 'Available commands: ' + commandList.join(', ');
    
    if (command === undefined) {
        return exitWithError('command is not defined\n' + errorMsg);
    }
    
    if (commands[command]) {
        commands[command]();
    } else {
        exitWithError('command "' + command + '" is not known\n' + errorMsg);
    }
}

loadConfig();
runCommand();

var _ = require('lodash');

module.exports = function parseArgv(defaults) {
    var yargs = require('yargs');

    function setDefaults(argv) {
        _.forEach(defaults || {}, function(val, prop) {
            argv.default(prop, val);
        });

        return argv;
    }

    function addCommonOptions(argv) {
        return argv
            .option('out', {
                alias: 'o',
                type: 'string',
                default: 'stdout',
                describe: 'The location to write output data to.'
            });
    }

    function addCommonCommand(argv, exampe) {
        return argv
            .example(exampe)
            .alias('h', 'help')
            .alias('h', '?')
            .help();
    }

    function runCommand(argv) {
        return argv.command('run <testname>', 'Run a test by name.', function(localYargs) {
            localYargs = addCommonCommand(
                localYargs,
                'grandma run <testname> --duration=2m --rate=200'
            );
            localYargs = addCommonOptions(localYargs);
            localYargs = setDefaults(localYargs);

            return localYargs
                .option('duration', {
                    alias: 'd',
                    demand: true,
                    type: 'string',
                    describe: 'The time for which the test will run.'
                })
                .option('rate', {
                    alias: 'r',
                    type: 'number',
                    describe: 'The rate of the tests, in n per second.'
                })
                .option('concurrent', {
                    alias: 'c',
                    type: 'number',
                    describe: 'The amount of concurrent tests to run at once.'
                })
                .option('threads', {
                    type: 'number',
                    default: 1,
                    describe: 'The amount of threads to use to run tests.'
                })
                .option('timeout', {
                    type: 'string',
                    description: 'A maximum amount of time to wait for each test to finish.'
                });
        });
    }

    function reportCommand(argv) {
        var command = 'report [glob]';
        var desc = 'Summarize the content of report files.';

        return argv.command(command, desc, function(localyargs) {
            localyargs = addCommonCommand(localyargs, 'grandma report *.txt --type=text');
            localyargs = addCommonOptions(localyargs);
            localyargs = setDefaults(localyargs);

            return localyargs
                .option('type', {
                    alias: 't',
                    type: 'string',
                    choices: ['json', 'text', 'plot', 'box', 'html'],
                    describe: 'The type of reporter to output'
                })
                .option('metadata', {
                    type: 'string',
                    describe: 'When used with `html` report, ' +
                              'provides metadata to include in the report'
                })
                .option('color', {
                    type: 'boolean',
                    default: true,
                    describe: 'Whether to print the report in color'
                });
        });
    }

    function diffCommand(argv) {
        var command = 'diff';
        var desc = 'Calculate difference in latencies among multiple test runs.';

        return argv.command(command, desc, function(localyargs) {
            localyargs = addCommonCommand(localyargs, 'grandma diff --logs one.log two.log');
            localyargs = addCommonOptions(localyargs);
            localyargs = setDefaults(localyargs);

            return localyargs
                .option('logs', {
                    alias: 'l',
                    type: 'array',
                    default: [],
                    describe: 'List of grandma outputs to diff'
                })
                .option('color', {
                    type: 'boolean',
                    default: true,
                    describe: 'Whether to print the report in color'
                });
        });
    }

    function helpCommand(argv) {
        return argv
            .command('help', 'Print this help message.')
            .option('help', {
                alias: 'h',
                describe: 'This help message.'
            });
    }

    function listCommand(argv) {
        var command = 'list';
        var desc = 'List all available test names.';

        return argv.command(command, desc, function(localyargs) {
            localyargs = addCommonOptions(localyargs);
            localyargs = setDefaults(localyargs);

            return localyargs;
        });
    }

    var argv = yargs.usage('\ngrandma <command> [options]');

    argv = runCommand(argv);
    argv = reportCommand(argv);
    argv = diffCommand(argv);
    argv = listCommand(argv);
    argv = setDefaults(argv);
    argv = helpCommand(argv);

    var returnObj = argv
        .help()
        .alias('v', 'version')
        .version()

        // add examples that show some common usage
        .example('grandma <command> -?')
        .example('grandma run <testname> --duration=10m --rate=300 --out=file.txt')
        .example('grandma report file.txt --type=plot --out=file.html')
        .example('grandma diff --logs one.log two.log')

        .argv;

    Object.defineProperty(returnObj, '_yargs', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: yargs
    });

    return returnObj;
};

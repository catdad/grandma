/* eslint-env mocha */
/* global Promise */

var path = require('path');
var util = require('util');
var fs = require('fs');

var expect = require('chai').expect;
var shellton = require('shellton');
var root = require('rootrequire');
var mkdirp = require('mkdirp');
var del = require('del');

var testdata = require('./data/testdata.js');
var expectations = require('./data/testexpectations.js');

describe('[harness]', function() {
    function shell(file, command) {
        var harness = path.resolve(root, 'test/_harnesses', file);
        var task = util.format('node "%s" %s', harness, command);
        var pathEnv = path.dirname(process.execPath);

        return new Promise(function(resolve, reject) {
            shellton({
                task: task,
                cwd: root,
                env: {
                    PATH: pathEnv
                }
            }, function(err, stdout, stderr) {
                if (err) {
                    return reject(err);
                }

                return resolve({
                    stdout: stdout,
                    stderr: stderr
                });
            });
        });
    }

    var hooks = (function() {
        var tempDir = path.resolve(root, 'temp');

        function init() {
            return new Promise(function(resolve, reject) {
                mkdirp(tempDir, function(err) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve();
                });
            });
        }

        function clean() {
            return del([tempDir]);
        }

        return {
            before: function() {
                return clean().then(init);
            },
            after: function() {
                return clean();
            }
        };
    }());

    beforeEach(hooks.before);
    afterEach(hooks.after);

    describe('grandma.run api', function() {
        it('allows the process to correctly exit when writing to stdout', function() {
            return shell('api-run.js', '--file fixtures/one.js')
                .then(function(io) {
                    var stdout = io.stdout.trim().split('\n');

                    expect(stdout).to.have.length.above(1);
                    expect(stdout.pop()).to.equal('done');
                    expect(io.stderr.trim()).to.equal('');
                });
        });

        it('allows the process to correctly exit when writing to a file stream', function() {
            return shell('api-run.js', '--file fixtures/one.js --out temp/api-run.txt')
                .then(function(io) {
                    expect(io.stdout.trim()).to.equal('done');
                    expect(io.stderr.trim()).to.equal('');
                });
        });

        it('allows the process to correctly exit when the test file does not exist', function() {
            return shell('api-run.js', '--file fixtures/not-a-real-file.js')
                .then(function(io) {
                    expect(io.stdout.trim()).to.equal('');
                    expect(io.stderr.trim())
                        .to.match(/Cannot find module/)
                        .and.to.match(/not-a-real-file\.js/);
                });
        });
    });

    describe('grandma.report api', function() {
        var reportPath = path.resolve(root, 'temp/testdata.log');

        function mockData() {
            return new Promise(function(resolve, reject) {
                fs.writeFile(reportPath, testdata.test.map(function(data) {
                    return JSON.stringify(data);
                }).join('\n'), function(err) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve();
                });
            });
        }

        function read(filepath) {
            return new Promise(function(resolve, reject) {
                fs.readFile(filepath, 'utf8', function(err, data) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
            });
        }

        beforeEach(mockData);

        var template = 'allows the process to correctly exit when generating %s report';
        ['text', 'plot', 'html', 'json', 'box'].forEach(function(type) {
            it(util.format(template, type), function() {
                var out = 'report.' + type;
                var args = '--in temp/testdata.log --out temp/' + out + ' --type ' + type;

                return shell('api-report.js', args)
                    .then(function(io) {
                        expect(io.stdout.trim()).to.equal('done');
                        expect(io.stderr.trim()).to.equal('');
                    })
                    .then(function() {
                        var filepath = path.resolve(root, 'temp', out);
                        return read(filepath);
                    })
                    .then(function(report) {
                        expectations[type].test(report.replace(/\n$/, ''));
                    });
            });
        });
    });
});

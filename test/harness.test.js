/* eslint-env mocha */
/* global Promise */

var path = require('path');
var util = require('util');

var expect = require('chai').expect;
var shellton = require('shellton');
var root = require('rootrequire');
var mkdirp = require('mkdirp');
var del = require('del');

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
        ['text', 'plot', 'html', 'json', 'box'].forEach(function(report) {
            it('allows the process to correctly exit when generating ' + report + ' report');
        });
    });
});

var path = require('path');
var util = require('util');

var shellton = require('shellton');
var through = require('through2');
var root = require('rootrequire');
var unstyle = require('unstyle').string;

module.exports = function run(command, input, done) {
    var task = util.format('%s "%s" %s', 'node', path.join('bin', 'cli.js'), command);
    var stream = through();

    shellton({
        task: task,
        cwd: root,
        stdin: stream,
        env: {
            PATH: path.dirname(process.execPath)
        }
    }, function(err, stdout, stderr) {
        if (err) {
            return done(err, stdout, stderr);
        }

        done(null, unstyle(stdout), unstyle(stderr));
    });

    stream.write(input);
    stream.end();
};

var path = require('path');
var util = require('util');

var shellton = require('shellton');
var through = require('through2');
var root = require('rootrequire');

module.exports = function run(command, input, done) {
    // TODO figure out how to use process.execPath instead of relying
    // on `node` to be in the path already
    var task = util.format('%s "%s" %s', 'node', path.join('bin', 'cli.js'), command);
    var stream = through();
    
    shellton({
        task: task,
        cwd: root,
        stdin: stream
    }, done);
    
    stream.write(input);
    stream.end();
};
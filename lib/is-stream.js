var isStream = require('is-stream');

isStream.stdio = function isStdio(stream) {
    return stream === process.stdin ||
           stream === process.stdout ||
           stream === process.stderr;
};

module.exports = isStream;

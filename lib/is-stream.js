var isStream = require('is-stream');

isStream.stdio = function isStdio(stream) {
    return stream === process.stdin ||
           stream === process.stdout ||
           stream === process.stderr;
};

isStream.assertStream = function assertStream(stream, type, errString) {
    if (!isStream[type](stream)) {
        throw new Error(errString);
    }
};

module.exports = isStream;

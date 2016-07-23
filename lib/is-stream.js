var isStream = require('is-stream');

function assertType(type) {
    if (type !== 'readable' && type !== 'writable') {
        throw new Error(type + ' is not a known stream type');
    }
}

function assertObjectMode(stream, state, errStr) {
    if (!stream[state] || !stream[state].objectMode) {
        throw new TypeError(errStr);
    }
}

isStream.stdio = function isStdio(stream) {
    return stream === process.stdin ||
           stream === process.stdout ||
           stream === process.stderr;
};

isStream.assertStream = function assertStream(stream, type, errStr) {
    assertType(type);
    
    if (!isStream[type](stream)) {
        throw new TypeError(errStr);
    }
};

isStream.assertObjectStream = function assertObjectStream(stream, type, errStr) {
    isStream.assertStream(stream, type, errStr);
    
    if (type === 'readable') {
        assertObjectMode(stream, '_readableState', errStr);
    } else if (type === 'writable') {
        assertObjectMode(stream, '_writableState', errStr);
    }
};

module.exports = isStream;

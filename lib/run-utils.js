var zlib = require('zlib');
var through = require('through2');
var eos = require('end-of-stream');

var isStream = require('./is-stream.js');
var Logger = require('./logger.js');

var hasBufferFrom = (function() {
    try {
        // Buffer.from was introduced in node 4,
        // but using a string did not work
        // until node 4.5, so simply testing for
        // the existence of this method does not work
        Buffer.from('a');
    } catch(e) {
        return false;
    }

    return true;
}());

function hasProp(obj, prop) {
    if (!obj) {
        return false;
    }

    return !!obj[prop];
}

function applyProp(obj, prop, args) {
    if (!hasProp(obj, prop)) {
        return;
    }

    obj[prop].apply(obj, args);
}

function strToBuffer(str) {
    return hasBufferFrom ?
        Buffer.from(str) :
        new Buffer(str);
}

function utils(opts) {
    var objectMode = opts.objectMode;

    var logger = Logger(opts);

    function debug() {
        applyProp(logger, 'log', arguments);
    }

    function debugError() {
        applyProp(logger, 'error', arguments);
    }

    // Just because we can, we will let through buffer the output stream,
    // so that we can just write to output whenever, and through will
    // back off the disk when it needs to.
    function wrapStream(stream) {
        var bufferOut = objectMode ? through.obj() : through();

        if (opts.zip === true && !objectMode) {
            bufferOut.pipe(zlib.createGzip()).pipe(stream);
        } else {
            bufferOut.pipe(stream);
        }

        function onFullEnd() {
            if (!bufferOut._fullEnd) {
                bufferOut._fullEnd = true;
                bufferOut.emit('fullEnd');
            }
        }

        bufferOut._fullEnd = false;

        eos(stream, onFullEnd);

        if (isStream.stdio(stream)) {
            eos(bufferOut, onFullEnd);
        }

        return bufferOut;
    }

    var output = wrapStream(opts.output);

    function writeToStream(data) {
        if (objectMode) {
            // just write the raw data here
            output.write(data);
        } else if (Buffer.isBuffer(data)) {
            output.write(data);
        } else if (typeof data === 'string') {
            output.write(strToBuffer(data));
        } else {
            writeToStream(JSON.stringify(data) + '\n');
        }
    }

    return {
        wrapStream: wrapStream,
        writeToStream: writeToStream,
        debug: debug,
        debugError: debugError,
        output: output
    };
}

module.exports = utils;

var zlib = require('zlib');
var through = require('through2');

var isStream = require('./is-stream.js');
var Logger = require('./logger.js');

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

function utils(opts) {
    var objectMode = opts.objectMode;
    var output = opts.output;
    
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

        bufferOut._fullEnd = false;

        // the first one of these will end
        stream.on('end', onFullEnd);
        stream.on('finish', onFullEnd);
        stream.on('close', onFullEnd);

        if (isStream.stdio(stream)) {
            bufferOut.on('end', onFullEnd);
        }

        return bufferOut;

        function onFullEnd() {
            if (!bufferOut._fullEnd) {
                bufferOut._fullEnd = true;
                bufferOut.emit('fullEnd');
            }
        }
    }
    
    function writeToStream(data) {
        if (objectMode) {
            // just write the raw data here
            output.write(data);
        } else if (Buffer.isBuffer(data)) {
            output.write(data);
        } else if (typeof data === 'string') {
            output.write(new Buffer(data));
        } else {
            writeToStream(JSON.stringify(data) + '\n');
        }
    }
    
    return {
        wrapStream: wrapStream,
        writeToStream: writeToStream,
        debug: debug,
        debugError: debugError
    };
}

module.exports = utils;

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
    var expectedCount = opts.expectedCount;
    
    var logger = Logger(opts);
    
    function debug() {
        applyProp(logger, 'log', arguments);
    }

    function debugError() {
        applyProp(logger, 'error', arguments);
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
    
    function writeHeader() {
        writeToStream({
            type: 'header',
            epoch: Date.now(),
            duration: opts.duration,
            rate: opts.rate || null,
            concurrent: opts.concurrent || null,
            targetCount: expectedCount,
            name: opts.testname || null
        });
    }
    
    function writeReport(report) {
        writeToStream(report);
    }
    
    return {
        writeToStream: writeToStream,
        writeHeader: writeHeader,
        writeReport: writeReport,
        debug: debug,
        debugError: debugError
    };
}

module.exports = utils;

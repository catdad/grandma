/* jshint node: true */

var _ = require('lodash');

function getNanoSeconds() {
    var hr = process.hrtime();
    return hr[0] * 1e9 + hr[1];
}

var loadTime = getNanoSeconds();

function now() {
    return (getNanoSeconds() - loadTime) / 1e6;
}

function writeStatus(err, key) {
    if (!this[key]) {
        return;
    }
    
    if (err) {
        this[key].status = 'failure';
        this[key].errorCode = err.errorCode || null;
    }
}

function Timer(extras) {
    if (!(this instanceof Timer)) {
        return new Timer(extras);
    }
    
    this.times = {};
    
    if (_.isPlainObject(extras)) {
        _.defaults(this, extras);
    }
}

Timer.prototype.start = function startTimer(id) {
    // Create this object will of the props it will need in the future.
    this.times[id] = {
        start: now(),
        end: null,
        duration: null,
        status: 'success'
    };
    
    return this;
};

Timer.prototype.end = function endTimer(id, status) {
    // If this timer does not exist, or if it has already ended,
    // return without updating the data.
    if (!this.times[id] || this.times[id].end !== null) {
        return this;
    }
    
    this.times[id].end = now();
    this.times[id].duration = this.times[id].end - this.times[id].start;
    
    if (status !== undefined) {
        this.times[id].status = status.toString();
    }
    
    return this;
};

Timer.prototype.report = function reportTimers(statusList) {
    if (statusList && Object.keys(statusList).length) {
        _.forEach(statusList, writeStatus.bind(this.times));
    }
    
    // I don't have a need to make a copy of this at this time,
    // and I would like to gain the speed of not copying it.
    return this.times;
};

module.exports = now;
module.exports.Timer = Timer;

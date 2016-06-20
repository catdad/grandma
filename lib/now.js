var util = require('util');
var _ = require('lodash');
var now = require('hitime');
var ParentTimer = now.Timer;

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
    
    ParentTimer.call(this, {
        status: 'success'
    });
    
    if (_.isPlainObject(extras)) {
        _.defaults(this, extras);
    }
}

util.inherits(Timer, ParentTimer);

Timer.prototype.report = function reportTimers(statusList) {
    ParentTimer.prototype.report.call(this);
    
    if (statusList && Object.keys(statusList).length) {
        _.forEach(statusList, writeStatus.bind(this.times));
    }
    
    return this.times;
};

module.exports = now;
module.exports.Timer = Timer;

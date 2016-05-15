/* jshint node: true */

module.exports = function Reporter(err, data) {
    if (err) {
        data.status = 'failure';
        data.errorCode = err.errorCode || null;
    } else {
        data.status = 'success';
    }
    
    return data;
};

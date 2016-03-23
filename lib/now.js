/* jshint node: true */

function getNanoSeconds() {
    var hr = process.hrtime();
    return hr[0] * 1e9 + hr[1];
}

var loadTime = getNanoSeconds();

module.exports = function () {
    return (getNanoSeconds() - loadTime) / 1e6;
};

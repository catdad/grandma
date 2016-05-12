/* jshint node: true */

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
    test: function(done) {
        var timeout = 1000 * getRandomInt(3, 6);
        setTimeout(done, timeout);
    }
};

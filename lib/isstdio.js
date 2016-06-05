module.exports = function isStdio(stream) {
    return stream === process.stdin ||
           stream === process.stdout ||
           stream === process.stderr;
};

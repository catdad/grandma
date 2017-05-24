module.exports = function record(start, end) {
    return {
        report: {
            fullTest: {
                start: start,
                end: end
            }
        }
    };
};

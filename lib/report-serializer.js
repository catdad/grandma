function appendTimeUnit(val) {
    return (+val).toFixed(3) + 'ms';
}

module.exports = {
    textArr: {
        latenciesTitle: function(name) {
            return [name + ':', 'mean', '50', '95', '99', 'max'];
        },
        latencies: function(latencies, name) {
            return [name].concat([
                latencies.mean,
                latencies['50'],
                latencies['95'],
                latencies['99'],
                latencies.max
            ].map(appendTimeUnit));
        }
    }
};

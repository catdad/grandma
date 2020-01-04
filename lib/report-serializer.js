function format(val) {
    return (+val).toFixed(3);
}

function appendTimeUnit(val) {
    return format(val) + 'ms';
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
        },
        metrics: function(metrics, name) {
            return [name].concat([
                metrics.mean,
                metrics['50'],
                metrics['95'],
                metrics['99'],
                metrics.max
            ].map(format));
        }
    }
};

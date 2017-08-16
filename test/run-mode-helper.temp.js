module.exports = function(lib) {
    return function(opts) {
        var api = opts.repeater;
        api.debug = opts.debug;
        api.writeOutput = opts.writeOutput;
        api.options = opts.options;

        api.on('task:run:internal', function(context) {
            opts.runTest(context);
        });

        Object.defineProperties(api, {
            runningCount: {
                get: function() {
                    return opts.getRunningCount();
                }
            },
            expectedCount: {
                enumerable: true,
                configurable: false,
                get: function() {
                    if (!opts.rate) {
                        return null;
                    }

                    return opts.duration === 0 ?
                        null :
                        Math.floor(opts.rate * (opts.duration / 1000));
                }
            }
        });

        return lib(api);
    };
};

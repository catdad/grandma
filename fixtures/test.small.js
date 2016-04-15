/* jshint node: true */

// We don't care about code coverage for fixtures files.
// Since these will be required by the fork workers directly,
// there is no way to actually instrument them.

/* istanbul ignore next: worker thread */
(function(module) {
    module.exports = {
        test: function(done) {
            process.nextTick(done);
        }
    };
})(module);

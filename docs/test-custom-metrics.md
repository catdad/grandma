# Test custom metrics

> [Table of Contents](readme.md)

During the `test` function, you can report custom metrics using `this.start(name)` and `this.end(name)`. In cases where you may have multiple asynchronous tasks that you would like to report on, you can use custom metrics to time only portions of your tests. Here is an example:

```javascript
var async = require('async');

module.exports = {
    test: function(done) {
        var that = this;

        async.parallel([
            function (next) {
                that.start('one');

                setTimeout(function() {
                    that.end('one');
                    next();
                }, 10);
            },
            function (next) {
                that.start('two');

                setTimeout(function() {
                    that.end('two');
                    next();
                }, 20);
            }
        ], function() {
            setTimeout(done, 5);
        });
    }
};
```

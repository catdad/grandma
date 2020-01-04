# Test custom metrics

> [Table of Contents](readme.md)

During the `test` function, you can report custom timer metrics using `this.start(name)` and `this.end(name)`. In cases where you may have multiple asynchronous tasks that you would like to report on, you can use custom metrics to time only portions of your tests. Here is an example:

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

You can also report any arbitrary custom numeric metrics manually:

```javascript
function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    test: function(done) {
        var that = this;

        that.metric('one', rnd(5, 10));
        that.metric('two', rnd(300, 500));
        that.metric('three', rnd(30, 100));

        that.start('four');

        setTimeout(function() {
            that.end('four');
            done();
        }, rnd(1, 5));
    }
};
```

Sample output from this would look like this:

```
Summary:    duration  rate     concurrent  total
            30ms      null     1           4

Latencies:  mean      50       95          99       max
fullTest    3.843ms   3.937ms  5.862ms     5.862ms  5.862ms
four        3.491ms   3.322ms  5.833ms     5.833ms  5.833ms
one         7.250     6.500    10.000      10.000   10.000
two         428.500   418.500  490.000     490.000  490.000
three       77.750    85.500   93.000      93.000   93.000
```

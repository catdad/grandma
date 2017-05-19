# API: running interactive tests

> [Table of Contents](readme.md)

You can interact with running tests through the API, to do some minimal adjustments while they are running.

### Adjusting `rate`

When running in rate mode, the object returned by `grandma.run` will have a rate property. You can set this property to any number you would like to change the rate at runtime. The rate will be adjusted accordingly as test runs finish and new ones are started.

```javascript
var fs = require('fs');
var path = require('path');
var grandma = require('grandma');

var output = fs.createWriteStream('path/to/report.log');

var options = {
    duration: '5m',
    rate: 20,
    output: output,
    test: {
        path: path.resolve('path/to/mytest.js'),
        name: 'mytest'
    }
};

function done(err) {
    if (err) {
        return console.error('something went wrong', err);
    }
    
    console.log('done!');
}

var task = grandma.run(options, done);

console.log(task.rate);
// prints: 20

// after the first minute, start running tests faster
setTimeout(function() {
    task.rate = 40;
}, 1000 * 60);
```

### Adjusting `concurrent`

When running in concurrent mode, the object returned by `grandma.run` will have a `concrrent` property. You can set this property to any number you would like to change the amount of concurrent tests at runtime. If changing to a larger number, more tests will be started immediately to meet that number. If set to a smaller number, `grandma` will wait until currently running tests complete before adjusting, so as to not interrupt any test functions currently in progress.

```javascript
var fs = require('fs');
var path = require('path');
var grandma = require('grandma');

var output = fs.createWriteStream('path/to/report.log');

var options = {
    duration: '1d',
    concurrent: 10,
    output: output,
    test: {
        path: path.resolve('path/to/mytest.js'),
        name: 'mytest'
    }
};

function done(err) {
    if (err) {
        return console.error('something went wrong', err);
    }
    
    console.log('done!');
}

var task = grandma.run(options, done);

console.log(task.concurrent);
// prints: 10

// double the concurrency every minute
setInterval(function() {
    task.concurrent = task.concurrent * 2;
}, 1000 * 60);
```

### Manually stopping the tests

In both concurrent and rate mode, you can manually stop the tests if you wish. To do so, you can use the `stop` method on the task object returned by `grandma.run`. When this is called, `grandma` will allow all currently running tests to complete, but will not start any more tests, and instead it will call the `done` callback of the `grandma.run` command.

```javascript
var grandma = require('grandma');
var through = require('through2');
var path = require('path');

var output = through.obj();

var options = {
    duration: '1d',
    concurrent: 10,
    output: output,
    test: {
        path: path.resolve('path/to/mytest.js'),
        name: 'mytest'
    }
};

function done(err) {
    if (err) {
        return console.error('something went wrong', err);
    }
    
    console.log('done!');
}

var task = grandma.run(options, done);
var count = 0;

output.on('data', function(report) {
    if (report.report) {
        // this sumarizes the data when a test is done
        count += 1;
    }
    
    // stop the task after we have reached 1000 tests
    if (count === 1000) {
        task.stop();
    }
});
```

### Pausing and resuming the test

Sometimes, you may wantt to pause the tests for a little while. This is sometimes necessary if you are load testing a server and want the server to get to an idle state before increasing rate or concurrency. _It is worth noting, however, that you should carefully consider whether pausing the test is really more appropriate than just running multiple tests at multiple rates or concurrencies. I leave that one up to you though._

You can do so through the `pause` and `resume` methods on the task object returned from `grandma.run`:

```javascript
var grandma = require('grandma');
var through = require('through2');
var path = require('path');

var output = through.obj();

var options = {
    duration: '1d',
    concurrent: 10,
    output: output,
    test: {
        path: path.resolve('path/to/mytest.js'),
        name: 'mytest'
    }
};

function done(err) {
    if (err) {
        return console.error('something went wrong', err);
    }
    
    console.log('done!');
}

var task = grandma.run(options, done);
var count = 0;

output.on('data', function(report) {
    if (report.report) {
        // this sumarizes the data when a test is done
        count += 1;
    }
    
    // pause for 10 seconds after we have reached 500 tests
    if (count === 500) {
        task.pause();
        
        setTimeout(function () {
            task.resume();
        }, 10 * 1000);
    }
    
    // stop the task after we have reached 1000 tests
    if (count === 1000) {
        task.stop();
    }
});
```

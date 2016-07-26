# API: Running tests

## `grandma.run({Object} options, {Function} callback)` → `{Object} task`

The run command takes an options object and a callback. It will trigger a test to start.

#### options:

The following options are available for running a test:

- **`duration`** _{string|number}_ - the amount of time that the test should run for. This is the minimum amount of time that `grandma` will continue starting new tests. However, the actual full run might be longer, if tests take a while to finish. This can be one of the following:
  - A number in milliseconds
  - A string written as any combinartion of a number an ending of:
    - `ms` (milliseconds)
    - `s` (seconds)
    - `m` (minutes)
    - `h` (hours)
    - `d` (days)
    - `w` (weeks)
  - _Example: `'1h30m26s'`_
- **`rate`** _{number}_ - the rate at which to start a new test, as a number per second. For example, `5` would indicate 5 tests runs per second. This value is not compatible with `concurrent`.
- **`concurrent`** _{number}_ - the number of tests to run at once. When this value is used, a set amount of tests will start immediately, and when any test finished, it will be replaced with a new one. If `rate` is defined, this value will be ignored, and instead, the tests will run according to the rate value.
- **`timeout`** _{string|number}_ - the amount of time to wait for each test before failing the test. The default is to wait indefinitely. This is set to a value similarly to `duration`. When a test times out, it will be reported as a failure with an `errorCode` of `-1`.
- **`threads`** _{number}_ - the number of thread workers to run the tests in. This property is optional and defaults to 1. There is usually no reason to set it higher than that.
- **`output`** _{stream}_ - a stream to write report data to. This can be any writable stream, such as a file stream, or a stream-like object, like a [through](https://github.com/rvagg/through2) stream.
- **`test`** _{object}_ - an object defining the test to run. It has the following properties:
  - **`path`** _{string}_ - a string path to the JavaScript file defining the test.
  - **`name`** _{string}_ - the name of the test. This value can be set to any string.

#### callback:

A function. It takes a single parameter, `error`. If error is present, the test did not complete successfully. The `error` object will contain details as to what happened. If it is falsy, the test completed successfully and the results are ready to use.

### Sample code:

Example that runs 20 tests per second for 5 minutes:

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

grandma.run(options, done);
```

Example that runs 10 concurrent tests for 1 day (24 hours):

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

grandma.run(options, done);
```


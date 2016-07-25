# grandma

[![Build][1]][2]
[![Test Coverage][3]][4]
[![Code Climate][5]][6]
[![Downloads][7]][8]
[![Version][9]][8]
[![Dependency Status][10]][11]

[1]: https://travis-ci.org/catdad/grandma.svg?branch=master
[2]: https://travis-ci.org/catdad/grandma

[3]: https://codeclimate.com/github/catdad/grandma/badges/coverage.svg
[4]: https://codeclimate.com/github/catdad/grandma/coverage

[5]: https://codeclimate.com/github/catdad/grandma/badges/gpa.svg
[6]: https://codeclimate.com/github/catdad/grandma

[7]: https://img.shields.io/npm/dm/grandma.svg
[8]: https://www.npmjs.com/package/grandma
[9]: https://img.shields.io/npm/v/grandma.svg

[10]: https://david-dm.org/catdad/grandma.svg
[11]: https://david-dm.org/catdad/grandma

This is a load testing library and CLI tool. It is inspired by the good parts of [Vegeta](https://github.com/tsenart/vegeta) and [JMeter](http://jmeter.apache.org/), but hopefully leaves out the bad parts of both.

* [Configuration](#grandmarc)
* [CLI](#cli)
* [Test Files](#tests)
* [API](#api)

## Install

You can install `grandma` as a global CLI tool:

```bash
npm install grandma
```

<a name="grandmarc"></a>
## `.grandmarc` file

You can set up an RC file to help with managing some of the setting, such as the directory of test files. Here is the content a sample file.

```javascript
{
    "directory": "fixtures",
    "threads": 1
}
```

All CLI flags are available through the RC file, and they can all be overwritten through the CLI.

<a name="cli"></a>
## CLI

To see the most up-to-date CLI, type:

```bash
grandma help
```

The following commands are available.

```bash
grandma run <testname> --duration=<duration> --rate=<rate> [options]
grandma report [glob=stdin] [options]
grandma list [options]
```

To see help on these commands, you can type one of:

```bash
grandma run -h
grandma report -h
```

The following options are available as flags (some are only relevant for the `run` command):

#### `grandma list`

- `directory` - The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests. I recommend just setting this in your `.grandmarc` file.

#### `grandma run`

- **`duration`** - (required) The duration for which the tests should run. Written as a number, followed by one of the following:
  - `ms` - millisecond
  - `s` - second
  - `m` - minute
  - `h` - hour
  - `d` - day
  - `w` - week

- **`rate`** - The rate at which the tests will run. Written as a number, representing number of tests per second.
  - Cannot be used with `concurrent`.
  - Either `rate` or `concurrent` is required.

- **`concurrent`** - The amount of concurrent tests to use at the same time.
  - Cannot be used with `rate`.
  - Either `rate` or `concurrent` is required.

- **`timeout`** - The amount of time to way for each test before treating it as a failure. The default is to wait indefinitely. This is a string value, set the same way as `duration`.

- **`directory`** - The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests.

- **`threads`** - The number of threads to use to run the tests. Note that this can be any integer, although there is not much benefit to running more threads than CPU cores available. This is optional, and the default value is 1.

- **`out`** - The name of an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

#### `grandma report`

- **`type`** - The type of report to create. Available values are:
  - `text` - (default) human readable text summary of the results, suitable for the terminal
  - `json` - summary of the results in json format, suitable for the terminal or to be parsed by another tool
  - `box` - a box plot in plain text, suitable for the terminal
  - `plot` - an HTML page containing a plot of the results, suitable for viewing in the browser

- **`out`** - The name of an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

<a name="tests"></a>
## Test files

Test files are written in JavaScript, and should be placed inside the folder defined by the `directory` CLI flag or `.grandmarc` file. All JavaScript files in the folder and all subfolders will be considered test files.

A test will export a single object, consisting of the following methods (in order): `beforeAll`, `beforeEach`, `test`, `afterEach`, and `afterAll`. Note that all methods other than `test` are optional and can be left out.

All methods will be called with a single parameter -- `done` -- which is a function to call when that method is complete. They will also be triggered with an object as the context -- the `this` keyword of the function.

`beforeEach`, `test`, and `afterEach` will all run in a worker thread, and are considered a full test run (as defined by the `rate` flag). However, only the `test` function is times and used for statistics.

`beforeAll` and `afterAll` will be executed in the parent thread. Though they will get a context object defined, some JavaScript values cannot be shared across threads (not to mention, changes in one thread will not be reflected in another thread). Therefore, only strings and numbers set in the `beforeAll` will be passed into thread workers to be used for the remaining functions. Also note that this means modifying values on the context object will not guarantee that any further tests will get those same values. The same goes for attempting to store state in objects in the test files, as there is no guarantee that they will execute in the same thread.

It is possible to run the tests using a single worker thread, in which case, state objects created during `beforeEach` will be available to `test` and `afterEach`. However, `beforeAll` and `afterAll` will still execute in the parent thread and cannot share state other than numbers and strings.

If you have a valid use case that is limited by the above, I would love to hear it. Please submit a [new issue](https://github.com/catdad/grandma/issues/new).

This is an example of a full test file:

```javascript
module.exports = {
    beforeAll: function(done) {
        process.nextTick(done);
    },
    beforeEach: function(done) {
        process.nextTick(done);
    },
    test: function(done) {
        process.nextTick(done);
    },
    afterEach: function(done) {
        process.nextTick(done);
    },
    afterAll: function(done) {
        process.nextTick(done);
    }
};
```

### Failing a test

In the `test` function, you can pass an error (or any truthy value) to the `done` callback to fail the test. Further, if the value you pass in has an `errorCode` property, that property will be used in order to group different failures together.

_Note: if you do not provide an error code, `0` will be used when binning and reporting errors. If a test times out, it will use an error code of `-1`. It is best to avoid using `0` or `-1` as the provided error code, in order to avoid confusion._

```javascript
module.exports = {
    test: function(done) {
        if (someTest) {
            // successfully complete the test
            done();
        } else if (someError) {
            // fail the test with specific errorCode
            done({ errorCode: 'someError' });
        } else {
            // fail the test for an unknown reason
            done(new Error('stuff happened'));
        }
    }
};
```

### Custom metrics

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

<a name="api"></a>
## API

Grandma exposes the `run` and `report` commands as an API.

```javascript
var grandma = require('grandma');
```

#### `grandma.run`

Options:
- **`duration`** _{string|number}_ - the amount of time that the test should run for. This is the minimum amount of time that `grandma` will continue starting new tests. However, the actual full run might be longer, if tests take a while to finish. This is a number in milliseconds, or a string written as a number with `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours), `d` (days), or `w` (weeks), or a combination of those values. Example: `'1h30m26s'`
- **`rate`** _{number}_ - the rate at which to start a new test, as a number per second. For example, `5` would indicate 5 tests runs per second. This value is not compatible with `concurrent`.
- **`concurrent`** _{number}_ - the number of tests to run at once. When this value is used, a set amount of tests will start immediately, and when any test finished, it will be replaced with a new one. If `rate` is defined, this value will be ignored, and instead, the tests will run according to the rate value.
- **`timeout`** _{string|number}_ - the amount of time to wait for each test before failing the test. The default is to wait indefinitely. This is set to a value similarly to `duration`. When a test times out, it will be reported as a failure with an `errorCode` of `-1`.
- **`threads`** _{number}_ - the number of thread workers to run the tests in. This property is optional and defaults to 1. There is usually no reason to set it higher than that.
- **`output`** _{stream}_ - a stream to write report data to. This can be any writable stream, such as a file stream, or a stream-like object, like a [through](https://github.com/rvagg/through2) stream.
- **`test`** _{object}_ - an object defining the test to run. It has the following properties:
  - **`path`** _{string}_ - a string path to the JavaScript file defining the test.
  - **`name`** _{string}_ - the name of the test. This value can be set to any string.

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

#### `grandma.report`

Options:
- **`type`** _{string}_ - text, json, box, or plot. Default is json.
- **`input`** _{stream}_ - readable stream of report data generated by `grandma.run`.
- **`output`** _{stream}_ - writable stream to output the report to. This value is optional for the json reporter.
- **`box`** _{object}_ - options of the box plot type.
  - **`width`** _{number}_ - the maximum width, in characters, of the box plot. Default is 75.

Json example:

```javascript
var fs = require('fs');
var input = fs.createReadStream('path/to/a/grandma.log');

var grandma = require('grandma');

grandma.report({
    input: input,
    type: 'json'
}, function(err, jsonObj) {
    if (err) {
        console.error('something went horribly wrong', err);
    } else {
        console.log(jsonObj);
    }
});

```

Text example printing to standard out:

```javascript
var fs = require('fs');
var input = fs.createReadStream('path/to/a/grandma.log');
var output = process.stdout; // print to the console

var grandma = require('grandma');

grandma.report({
    input: input,
    output: output,
    type: 'text'
}, function(err) {
    if (err) {
        console.error('something went horribly wrong', err);
    } else {
        console.log('the report was written to the output stream');
    }
});
```

Plot example writing to a file:

```javascript
var fs = require('fs');
var input = fs.createReadStream('path/to/a/grandma.log');
var output = fs.createWriteStream('path/to/a/report.html');

var grandma = require('grandma');

grandma.report({
    input: input,
    output: output,
    type: 'plot'
}, function(err) {
    // ...
});
```

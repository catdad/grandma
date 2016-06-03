# grandma

[![Build][1]][2]
[![Code Climate][5]][6]
[![Downloads][7]][8]
[![Version][9]][8]
[![Dependency Status][10]][11]

[1]: https://travis-ci.org/catdad/grandma.svg?branch=master
[2]: https://travis-ci.org/catdad/grandma

[5]: https://codeclimate.com/github/catdad/grandma/badges/gpa.svg
[6]: https://codeclimate.com/github/catdad/grandma

[7]: https://img.shields.io/npm/dm/grandma.svg
[8]: https://www.npmjs.com/package/grandma
[9]: https://img.shields.io/npm/v/grandma.svg

[10]: https://david-dm.org/catdad/grandma.svg
[11]: https://david-dm.org/catdad/grandma

This is a load testing library and CLI tool. It is inspired by the good parts of [Vegeta](https://github.com/tsenart/vegeta) and [JMeter](http://jmeter.apache.org/), but hopefully leaves out the bad parts of both.

## Alpha notice

**This project is still in its very early stages. I am still working on the MVP and the project is not yet ready for use. If you would like to see what is happening, I encourage you to look at the [MVP milestone](https://github.com/catdad/grandma/milestones/mvp).**

**I reserve the right to break any of the APIs presented here without notice, until the `0.1.0` release, at which point, I will begin following semver.**

## Install

You can install `grandma` as a global CLI tool:

    npm install grandma

## `.grandmarc` file

You can set up an RC file to help with managing some of the setting, such as the directory of test files. Here is the content a sample file.

```
{
    "directory": "fixtures",
    "threads": 1
}
```

All CLI flags are available through the RC file, and they can all be overwritten through the CLI.

## CLI

To see the most up-to-date CLI, type:

    grandma help

The following commands are available.

    grandma run <testname> --duration=<duration> --rate=<rate> [options]
    grandma report [glob=stdin] [options]
    grandma list [options]

To see help on these commands, you can type one of:

    grandma run -h
    grandma report -h

The following options are available as flags (some are only relevant for the `run` command):

- `duration` - (run only, required) The duration for which the tests should run. Written as a number, followed by one of the following:
  - `ms` - millisecond
  - `s` - second
  - `m` - minute
  - `h` - hour
  - `d` - day
  - `w` - week
- `rate` - (run only) The rate at which the tests will run. Written as a number, representing number of tests per second.
  - Cannot be used with `concurrent`.
  - Either `rate` or `concurrent` is required.
- `concurrent` - (run only) The amount of concurrent tests to use at the same time.
  - Cannot be used with `rate`.
  - Either `rate` or `concurrent` is required.
- `directory` - (run and list) The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests.
- `threads` - (run only, defaults to 1) The number of threads to use to run the tests. Note that this can be any integer, although there is not much benefit to running more threads than CPU cores available.
- `out` - (run and list) The name of an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.
- `type` - (report only) The type of report to create. Available values are:
  - `text` - human readable text summary of the results
  - `json` - summary of the results in json format
  - `plot` - an HTML page containing a plot of the results

## Test files

Test files are written in JavaScript, and should be placed inside the folder defined by the `directory` CLI flag or `.grandmarc` file. All JavaScript files in the folder and all subfolders will be considered test files.

A test will export a single object, consisting of the following methods (in order): `beforeAll`, `beforeEach`, `test`, `afterEach`, and `afterAll`. Npte that all methods other than `test` are optional and can be left out.

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

_Note: if you do not provide an error code, `0` will be used when binning and reporting errors, so avoid using `0` as the provided error code._

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
            // fail the test for an unknow reason
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

## API

TODO. Don't try to use this for now.

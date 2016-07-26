# Writing `grandma` tests

Test files are written in JavaScript, and should be placed inside the folder defined by the `directory` CLI flag or `.grandmarc` file. All JavaScript files in the folder and all subfolders will be considered test files.

A test will export a single object, consisting of the following methods (in order or execution):
* `beforeAll` - runs first, before any tests are started. This function will run only once.
* `beforeEach` - runs before each execution of a test. It will run for the same amount of iterations as the test. It is not reflected in the time reported for the test.
* `test` - the actual code being tested, and is the only require function in the test file. This is the only function that accounts for the time when genearting reports. The test function context also has special methods that allow for [reporting custom metrics](test-custom-metrics.md).
* `afterEach` - runs after each execution of a test. It will run for the same amount of iterations as the test. It will always run, even if the test is failed. It is not reflected in the time reported for the test.
* `afterAll` - runs once, after all tests have completed.

Note that all methods other than `test` are optional and can be left out.

All methods will be called with a single parameter -- `done` -- which is a function to call when that method is complete. They will also be triggered with an object as the context -- the `this` keyword of the function.

`beforeEach`, `test`, and `afterEach` will all run in a worker thread, and are considered a full test run (as defined by the `rate` or `concurrent` parameter). However, only the `test` function is timed and used for statistics.

`beforeAll` and `afterAll` will be executed in the parent thread. Though they will get a context object defined, some JavaScript values cannot be shared across threads (not to mention, changes in one thread will not be reflected in another thread). Therefore, only strings and numbers set in the `beforeAll` method will be passed into thread workers to be used for the remaining functions. Also note that this means modifying values on the context object will not guarantee that any further tests will get those same values. The same goes for attempting to store state in objects in the test files, as there is no guarantee that they will execute in the same thread.

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

## Failing a test

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

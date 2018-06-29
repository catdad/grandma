# Test custom metadata

>  [Table of Contents](readme.md)

For the advanced users, you may choose to use `grandma` reports for more robust statistical calculations (parse at your own risk). In those cases, you may wish to have additional metadata output in each report entry. You can do that using the `data` object in the test context. Anything stored in `data` will be output to the final report line in the test output. Here is an example:

```javascript
module.exports = {
    beforeAll: function(done) {
        // set any number or string value
        this.data.someNumber = 1;
        this.data.someString = 'value';

        done();
    },
    beforeEach: function(done) {
        // use previously set values
        console.log(this.data.someString);

        done();
    },
    test: function(done) {
        // overload the entire object
        this.data = { test: 'yes' };

        done();
    },
    afterEach: function(done) {
        console.log(this.data.test); // 'yes'
        console.log(this.data.someNumber); // undefined

        done();
    }
};
```

_Note that due to sharing data across threads, only strings and numbers will be preserved in the `data` bucket. This is the same limitation as [the rest of the shared context](test-files.md#sharing-state-between-the-test-functions)._

# Tests with caterogies

> [Table of Contents](readme.md)

Sometimes, you need to write a test that simulates some realistic user schenarios. This natually results in a single test that actually contains a variety of different behaviors. For example, you might provide a small or a large amount of input, at random, to simulate a realistic user load. This mixed test often raises questions of what exactly was slow, and what exactly resulted in the mixed results. This is where caterogies can help.

With categories, you can split tests into groups, allowing the report to be split as well, while still providing allowing the mixed test to run as one continuous test. This is done by using `this.category('name')` during a test. You can call this any time during a test, passing in any number of strings as an array or multiple parameters, such as:

```javascript
this.category('one');
this.category(['two', 'three']);
this.category(['four'], 'five');
```

Results will be collected for the overall test set, as well as for each individual group, allowing you to see how the results for a group differ from the overall test set.

Example:

```javascript
var fs = require('fs');
var path = require('path');
var request = erquire('request');

var idx = 0;
var inputFiles = fs.readdirSync('./input-files');

module.exports = {
    test: function (done) {
        var that = this;
        
        var filename = inputFiles[idx++ % inputFiles.length];
        var filetype = path.extname(filename).slice(1);
        var length = 0;
        
        // record the type of file, assuming it matters to
        // your test scenario
        this.category(filetype);
        
        var stream = fs.createReadStream(filename);
        
        request.put('http://myservice/upload', function (err, res, body) {
            done();
        }).pipe(stream);
        
        stream.on('data', function (chunk) {
            lenght += chunk.length;
        });
        
        stream.on('end', function () {
            // record the general size of the file
            var mb = 1024 * 1024;
            var size = Math.round((length * mb) / mb);
            
            that.category(size + 'ish MB');
        });
    }
};

```

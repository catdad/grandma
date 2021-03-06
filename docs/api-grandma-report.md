# API: reporting on a test

> [Table of Contents](readme.md)

### `grandma.report({Object} options, {Function} callback)` → `void`

The run command takes an options object and a callback.

#### `options`:

The following options are available for reporting on a test log:

- **`type`** _{string}_ - text, json, box, plot, or html. Default is json.
- **`input`** _{stream}_ - readable stream of report data generated by `grandma.run`.
- **`output`** _{stream}_ - writable stream to output the report to. This value is optional for the `json` type is specified.
- **`metadata`** _{string}_ - used with `type: 'html'`, provides metadata that will be included in the report as plain text.
- **`box`** _{object}_ - options of the box plot type.
  - **`width`** _{number}_ - the maximum width, in characters, of the box plot. Default is 75.

#### `callback`:

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

HTML example, including all environment variables as metadata:

```javascript
var fs = require('fs');
var input = fs.createReadStream('path/to/a/grandma.log');
var output = fs.createWriteStream('path/to/a/report.html');

var grandma = require('grandma');

grandma.report({
    input: input,
    output: output,
    type: 'html',
    metadata: JSON.stringify(process.env, null, 2)
}, function(err) {
    // ...
});
```

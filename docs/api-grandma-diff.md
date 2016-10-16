# API: calculating the latency differences among multiple test runs

> [Table of Contents](readme.md)

### `grandma.diff({Object|Array} streams, {Object} options, {Function} callback)` → `void`

The diff command allows you to calculate the difference in timing among multiple test runs. It takes an array or hash object of streams, an options object, and a callback.

#### `streams`:

This is an array or hash object of readable streams, as such:

```javascript
var fs = require('fs');

var streams = [
    fs.createReadStream('one.log'),
    fs.createReadStream('two.log')
];
```

```javascript
var fs = require('fs');
var streams = {
    one: fs.createReadStream('one.log'),
    two: fs.createReadStream('two.log')
};
```

When using a hash object, the keys will be displayed in the names above the latencies, so that you can more easily identify which piece of the report corresponds to the originating log file.

#### `options`:

The following options are available for the diff reporter:

- **`type`** _{string}_ (required) - The type of data to output as the report. Currently, this property only support the value `'text'`.
- **`mode`** _{string}_ (required) - The mode to use to diff the logs. The following are supported:
  - `'fastest'` - Finds the fastest mean from all of the reports being diffed, and calculates the difference of all other reports from the fastest.
- **`output`** _{stream}_ (required) - The writable stream to output the report to.

#### `callback`:

The function to call when the reporting is done. Any error encountered during reporting will be provided as the first argument in this function.

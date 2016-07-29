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

To find out more, see the [`.grandmarc` Doc Page](docs/cli-grandmarc.md);

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

See more information about writing tests in the [test files help topic](docs/test-files.md).

<a name="api"></a>
## API

Grandma exposes the `run` and `report` commands as an API.

```javascript
var grandma = require('grandma');
```

#### `grandma.run`

See more information about using run in the [`grandma.run` API page](docs/api-grandma-run.md).

#### `grandma.report`

See more information about using report in the [`grandma.report` API page](docs/api-grandma-report.md).

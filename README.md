# [<img title="grandma" src="assets/banner.svg" width="100%" alt="grandma" />](https://github.com/catdad/grandma)

[![Linux Build][travis.svg]][travis]
[![Windows Build][appveyor.svg]][appveyor]
[![Test Coverage][codeclimate-cov.svg]][codeclimate-cov]
[![Code Climate][codeclimate-gpa.svg]][codeclimate-gpa]
[![Downloads][npm-download.svg]][npm]
[![Version][npm-version.svg]][npm]
[![Dependency Status][daviddm.svg]][daviddm]

[travis.svg]: https://travis-ci.org/catdad/grandma.svg?branch=master
[travis]: https://travis-ci.org/catdad/grandma

[codeclimate-cov.svg]: https://codeclimate.com/github/catdad/grandma/badges/coverage.svg
[codeclimate-cov]: https://codeclimate.com/github/catdad/grandma/coverage

[codeclimate-gpa.svg]: https://api.codeclimate.com/v1/badges/f4da9ebe407884c70af6/maintainability
[codeclimate-gpa]: https://codeclimate.com/github/catdad/grandma

[npm-download.svg]: https://img.shields.io/npm/dm/grandma.svg
[npm]: https://www.npmjs.com/package/grandma
[npm-version.svg]: https://img.shields.io/npm/v/grandma.svg

[daviddm.svg]: https://david-dm.org/catdad/grandma.svg
[daviddm]: https://david-dm.org/catdad/grandma

[appveyor.svg]: https://ci.appveyor.com/api/projects/status/github/catdad/grandma?branch=master&svg=true
[appveyor]: https://ci.appveyor.com/project/catdad/grandma

This is a load testing library and CLI tool. It is inspired by the good parts of [Vegeta](https://github.com/tsenart/vegeta) and [JMeter](http://jmeter.apache.org/), but hopefully leaves out the bad parts of both.

* [Test Files](#test-files)
* [Configuration](#grandmarc-file)
* [CLI](#cli)
* [API](#api)

## Install

You can install `grandma` as a global CLI tool:

```bash
npm install grandma
```

## [Test files][tests]

Here is a quick example of a test file:

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

All functions other than `test` are optional, and you can exclude them if you do not need them. All functions are asynchronous, and you must call the `done` callback to continue. For more information about writing tests, see the [test files help topic][tests].

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
grandma run --help
grandma report --help
```

The following options are available as flags (some are only relevant for the `run` command):

#### [`grandma list`][cli-list]

Lists all the tests in your test suite. You can use these names in `grandma run` to run the test. See more information bout it in the [`granda list` CLI page][cli-list].

#### [`grandma run`][cli-run]

Run a test named "pineapples" for 10 minutes at a rate of 500 tests per second:

```bash
grandma run pineapples --duration 10m --rate 500 --out pineapples.log
```

Run a test named "peaches" for one and a half hours, running 100 concurrent tests:

```bash
grandma run peaches --duration 1h30m --concurrent 100 --out peaches.log
```

To find out more about the CLI, please see the [`grandma run` CLI page][cli-run].

_Note: I will assume that you have configured the test directory in the [`.grandmarc`][rc] file, so it was not included it in these examples._

#### [`grandma report`][cli-report]

Print a plain text report of the previously-described test run:

```bash
grandma report pineapples.log
```

You can also create an HTML page containing an interactive graph of the results:

```bash
grandma report pineapples.log --type html --out pineapples.html
```

By default, all reports will print to standard output, unless you specify a file in the `--out` flag.

You can find more information about the available reports and the data they provide in the [`grandma report` CLI page][cli-report].

#### [`grandma diff`][cli-diff]

Compares two or more test runs, calculating the difference in timing among them.

```bash
grandma diff --logs one.log two.log three.log
```

## [`.grandmarc` file][rc]

You can set up an RC file to help with managing some of the setting, such as the directory of test files. Here is the content a sample file.

To find out more, see the [`.grandmarc` doc page][rc].

## API

Grandma exposes the `run` and `report` commands as an API.

```javascript
var grandma = require('grandma');
```

#### [`grandma.run`][api-run]

See more information about using run in the [`grandma.run` API page][api-run].

#### [`grandma.report`][api-report]

See more information about using report in the [`grandma.report` API page][api-report].

[tests]: docs/test-files.md
[rc]: docs/cli-grandmarc.md
[cli-list]: docs/cli-grandma-list.md
[cli-run]: docs/cli-grandma-run.md
[cli-report]: docs/cli-grandma-report.md
[cli-diff]: docs/cli-grandma-diff.md
[api-run]: docs/api-grandma-run.md
[api-report]: docs/api-grandma-report.md

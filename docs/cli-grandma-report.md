# CLI: reporting on a test

> [Table of Contents](readme.md)

Once you have run a test and have the log, you can use it to build several different reports. All of this functionality is also available throught the [`grandma` API](api-grandma-report.md).

The CLI has the following options:

- **`type`** - The type of report to create. Available values are listed below.

- **`out`** - The path to an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

#### `text`

This is a plain text report designed to be printed to and read in your terminal. It will contain some metadata about the test task, as well as statistics about the results. This is the default report if you do not specify one.

#### `json`

This will create a JSON summary of the test task, including some test metadata and some statistics about the results.

#### `box`

This will generate a plain text box plot, showing you the distribution of results. This can be a nice complement to the `text` report at times.

#### `plot`

This is a special report, because it really should be printed to the terminal. This report generates an HTML page that will contain an interactive graph of the results. Use this with the `--out` flag or redirect it to a file, so that you can view it in your browser.

### Input data

There are two options for input data. You can either provide a single file name or file glob, or you can pipe the data into `stdin`.

Depending on your use case, you should mostly be able to input just a single file:

```bash
grandma report pineapples.log
```

In some cases, like when you need to run `grandma` on multiple clients in order to test a very large cluster, you will have multiple files that contain reports. You can define a glob in order to read all of them and output a combined report:

```bash
grandma report fruits/*.log
```

Sometimes, when doing quick tests, you may not even want to deal with files (I know I don't). In those cases, you can use `grandma` ability read and write to/from standard io, in order to run a test and output a report all in one command:

```bash
grandma run pineapples -d 10s -r 500 | grandma report
```

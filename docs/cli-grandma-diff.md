# CLI: calculating the latency differences among multiple test runs

> [Table of Contents](readme.md)

Whenyou have run multiple tests -- perhaps using different concurrency or rate values, or using different server settings -- you may want to see the difference between those multiple test runs. You can do so using the `diff` command in the CLI or though the [`grandma` API](api-grandma-diff.md).

The CLI has the following options:

- **`logs`** - The logs to diff. This property is an array. You can follow it with any number of globs, each one representing a set of logs for a particular test run.

- **`out`** - The path to an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

### Examples

Diff multiple log files that consist of a single log:

```bash
grandma diff --logs one.log two.log three.log
```

Diff multiple groups of log files, for example, when a single test run was split up across multiple clients, to generate higher traffic than is possible with one client. In this example, we assume that names follow the patter of `one.1.log`, `one.2.log`, `one.3.log`.

```bash
grandma diff --logs "one.*.log" "two.*.log"
```

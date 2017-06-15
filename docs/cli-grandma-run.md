# CLI: running a test

> [Table of Contents](readme.md)

The `run` command is used to run a test. You can find information about this command through the CLI by typing:

```bash
grandma run --help
```

The `run` command has the following options:

- **`duration`** - (required) The duration for which the tests should run. Written as a number, followed by one of the following:
  - `ms` - millisecond
  - `s` - second
  - `m` - minute
  - `h` - hour
  - `d` - day
  - `w` - week

  There is a special case when using a 0 with any unit -- such as `0s` or `0m` -- which will allow the tests to run indefinitely, until they are stopped manually.

- **`rate`** - The rate at which the tests will run. Written as a number, representing number of tests per second.
  - Cannot be used with `concurrent`.
  - Either `rate` or `concurrent` is required.

- **`concurrent`** - The amount of concurrent tests to use at the same time.
  - Cannot be used with `rate`.
  - Either `rate` or `concurrent` is required.

- **`timeout`** - The amount of time to wait for each test before treating it as a failure. The default is to wait indefinitely. This is a string value, set the same way as `duration`.

- **`directory`** - The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests.

- **`threads`** - The number of threads to use to run the tests. Note that this can be any integer, although there is not much benefit to running more threads than CPU cores available. This is optional, and the default value is 1.

- **`out`** - The name of an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

See the [`.grandmarc` doc](cli-grandmarc.md) to find out how you can configure any of these through an rc file.

### Examples

_Note: I will assume that you have configured the test directory in the [`.grandmarc`](cli-grandmarc.md) file, and will skip including it in these examples._

Run a test named "pineapples" for 10 minutes at a rate of 500 tests per second:

```bash
grandma run pineapples --duration 10m --rate 500 --out pineapples.log
```

Run a test named "peaches" for one and a half hours, running 100 concurrent tests:

```bash
grandma run peaches --duration 1h30m --concurrent 100 --out peaches.log
```

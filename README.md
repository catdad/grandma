# grandma

This is a load testing library ad CLI tool. It is inspired by the good parts of [Vegeta](https://github.com/tsenart/vegeta) and [JMeter](http://jmeter.apache.org/), but hopefully leaves out the bad parts of both.

## Alpha notice

**This project is still in its very early stages. I am still working on the MVP and the project is not yet ready for use. If you would like to see what is happening, I encourage you to look at the [MVP milestone](https://github.com/catdad/grandma/milestones/mvp).**

**I reserve the right to break any of the APIs presented here without notice, until the `0.1.0` release, at which point, I will begin following semver.**

## Install

You can install `grandma` as a global CLI tool:

    npm install -i grandma
    
## `.grandmarc` file

You can set up an RC file to help with managing some of the setting, such as the directory of test files. Here is the content a sample file.

```
{
    "directory": "fixtures",
    "threads": 1
}
```

All CLI flags are available through the RC file, and they can all be overwritten through the CLI.

## CLI

To see the most up-to-date CLI, type:

    grandma help

The following commands are available.

```
grandma run <testname> --duration=<duration> --rate=<rate> [options]
grandma report <glob> [options]
grandma list [options]
```

The following options are available as flags (some are only relevant for the `run` command):

- `duration` - (run only, required) The duration for which the tests should run. Written as a number, followed by one of the following:
  - `ms` - millisecond
  - `s` - second
  - `m` - minute
  - `h` - hour
  - `d` - day
  - `w` - week
- `rate` - (run only, requires) The rate at which the tests will run. Written as a number, representing number of tests per second.
- `directory` - (run and list) The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests.
- `threads` - (run only, defaults to 1) The number of threads to use to run the tests. Note that this can be any integer, although there is not much benefit to running more threads than CPU cores available.
- `out` - (run only) The name of an output file to write the results to. Defaults to writing to standard output. You can also specify `stdout` if you wish to write to standard output explicitly.

## API

TODO. Don't try to use this for now.

# CLI: listing available tests

> [Table of Contents](readme.md)

Once you build up a sufficiently large suite of tests, you will likely start to forget what tests exist for you to run. This is where the list command comes in.

The list command has one single option:

- **`directory`** - The folder that contains tests. All subfolders will be parsed as well, assuming all `.js` files are tests. I recommend just setting this in your `.grandmarc` file.

However, since this option is unlikely to ever change in your test suite, I suggest that you create a [`.grandmarc` configuration file](cli-grandmarc.md) and set your diretory there, so that you don't have to pass it into every command.

This command will produce a list of test names that you can use in [`grandma run`](cli-grandma-run.md), in order to run that test.

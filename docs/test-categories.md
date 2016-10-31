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

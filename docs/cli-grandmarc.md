# CLI: using an rc file to provide some options

You can set defaults for any of the CLI parameters in a `.grandmarc` file at the root of your project, so that you don't have to specify all properties in the CLI every time you run it. This is convenient for properties that will never change in your project, such as `--diractory`. To define any setting, use its long name (e.g. `duration` instead of `d`) set to your desired property. The format of this file is JSON.

```javascript
{
    "directory": "fixtures",
    "threads": 1
}
```

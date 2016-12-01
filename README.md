# good-path-glob

[Glob](https://en.wikipedia.org/wiki/Glob_(programming)) based event filter stream for [Good](https://github.com/hapijs/good) event from [Hapi](https://github.com/hapijs/hapi) path.

[![Current Version](https://img.shields.io/npm/v/good-path-glob.svg?style=flat)](https://www.npmjs.com/package/good-path-glob)

## Usage

good-path-glob contains a `PathGlob` stream for filtering [good](https://github.com/hapijs/good) events from [hapi](https://github.com/hapijs/hapi) path with glob pattern. 

## Methods

### `PathGlob(events, [options])`

Creates a new PathGlob transform stream where:

- `events` an object where each key is a valid good event and the value is one of the following:
    - `string` - a glob pattern to include when filtering. '*' indicates no filtering.
    - `array` - array of path patterns to filter. `[]` indicates no filtering.
    - `object` - an object with the following values
        - `include` - string or array representing path pattern(s) to *include* when filtering
        - `exclude` - string or array representing path pattern(s) to *exclude* when filtering. `exclude` takes precedence over any `include` paths. 
- `[options]` configuration object that gets passed to the Node [`Stream.Transform`](http://nodejs.org/api/stream.html#stream_class_stream_transform) constructor. **Note** `objectMode` is always `true` for all `PathGlob` objects.

### `PathGlob.subscription(events)`

A static method on `PathGlob` that creates a new event subscription map where:

- `events` the same arguments used in the `PathGlob` constructor.

```js
const PathGlob = require('good-path-glob');

PathGlob.subscription({ request: '*', response: ['**/hapi/*', '**/foo/**/bar'] });

// Results in
// {
//  request: { include: [], exclude: [] },
//  response: { include: [ '**/hapi/*', '**/foo/**/bar' ], exclude: [] } 
// }

PathGlob.subscription({ request: { exclude: 'debug/*' }, response: { include: ['**/hapi/*', '**/foo/**/bar'], exclude: '**/sensitive/**' } });

// Results in
// {
//  request: { include: [], exclude: [ 'debug/*' ] },
//  response: { include: [ '**/hapi/*', '**/foo/**/bar' ], exclude: [ '**/sensitive/**' ] }
// }
```

Useful for creating an event subscription to be used with `PathGlob.filter` if you do not plan on creating a pipeline coming from good and instead want to manage event filtering manually.


### `PathGlob.filter(subscription, data)`

Returns `true` if the supplied `data.event` + `data.path` should be reported based on `subscription` where:

- `subscription` - a subscription map created by `PathGlob.subscription()`.
- `data` - event object emitted from good/hapi which may contain the following keys:
    - `event` - a string representing the event name of `data`
    - `path` - a string representing path associated pattern with this event.

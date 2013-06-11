Simple utilities for nodeunits (like test builders and assertions),
particularly around Q promises.

In normal nodeunit, you add a test like this:

```js
exports.testFunction = function (test) {
  promise.run()
    .fail(failureHandler)
    .fin(test.done.bind(test))
}
```

In nodeunitq, you write a test like this:

```js
var nodeunitq = require('nodeunitq')
var builder = new Builder(exports)

builder.add(function (test) {
  return promise.run()
})
```

And nodeunitq will take care of the failure handling for you.
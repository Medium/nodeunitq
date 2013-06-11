// Copyright 2013 The Obvious Corporation

var util = require('util')

/**
 * @param {Object} localExports The module exports object to add test methods to.
 * @constructor
 */
function Builder(localExports) {
  this._exports = localExports
}


/**
 * Call as:
 * builder.add(function testName(test) { ... })
 * or
 * builder.add('testName', function(test) { ... })
 *
 * If the function returns a Q promise, then we will automatically handle failures
 * or call test.done() as appropriate.
 *
 * @param {Function|string} fnOrName The function, or the name of a function
 * @param {Function=} fn The function, if the first parameter was the name.
 */
Builder.prototype.add = function (fnOrName, fn) {
  var fn = fnOrName instanceof Function ? fnOrName : fn
  if (!(fn instanceof Function)) {
    throw new Error('Missing function')
  }

  var name = typeof fnOrName == 'string' ? fnOrName : fn.name
  if (!name) {
    throw new Error('Missing function name ' + fn.toString())
  }

  if (name in this._exports) {
    throw new Error('Test already exists for name ' + name)
  }

  this._exports[name] = runTestFunction.bind(null, fn)
}

/**
 * Run a test function
 *
 * @param {Function} fn The function
 * @param {NodeUnit} test The nodeunit test object.
 */
function runTestFunction(fn, test) {
  try {
    var p = fn(test)

    // If this looks like a promise, attach all the appropriate handlers
    if (p && p.fail && p.fin) {
      p.fail(function (e) {
        _printError(test, e)
      })
      .fin(function () {
        test.done()
      })
    }

  } catch (e) {
    _printError(test, e)
  }
}

function _printError(test, e) {
  if (e && e.stack) {
    test.ok(false, String(e.stack))
  } else {
    test.ok(false, util.inspect(e, true, 5))
  }
}

module.exports = Builder

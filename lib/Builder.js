// Copyright 2013 The Obvious Corporation

var Q = require('q')
var util = require('util')
var assert = require('assert')
var ClearTimeoutEnvironment = require('./ClearTimeoutEnvironment')


/**
 * @param {Object} localExports The module exports object to add test methods to.
 * @constructor
 */
function Builder(localExports) {
  this._exports = localExports

  this._thisObj = {}

  /** @private {Array} */
  this._environmentProviders = []

  /** @private {Array} */
  this._activeEnvironments = []

  /** @private {Function} */
  this._wrappedSetUp = localExports.setUp || this._defaultSetUpTearDown

  /** @private {Function} */
  this._wrappedTearDown = localExports.tearDown || this._defaultSetUpTearDown

  var self = this
  Object.defineProperty(localExports, 'setUp', {
    get: function () {
      return function () {
        self._thisObj = this // Init the default "this" object.
        return self._setUp.apply(self, arguments)
      }
    }.bind(this),
    set: function (fn) {
      this._wrappedSetUp = fn
    }.bind(this)
  })

  Object.defineProperty(localExports, 'tearDown', {
    get: function () {
      return this._tearDown.bind(this)
    }.bind(this),
    set: function (fn) {
      this._wrappedTearDown = fn
    }.bind(this)
  })

  // The ClearTimeoutEnvironment is a default environment.
  this.addEnvironmentConstructor(ClearTimeoutEnvironment)
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

  this._exports[name] = function (test) {
    // Preserve the 'this' context.
    return runTestFunction.call(this, fn, test)
  }
}


/**
 * Call as:
 * builder.addEnvironment(environment)
 * where 'environment' is an object with 2 properties: setUp and tearDown.
 *
 * The environment will be invoked during setUp/tearDown
 *
 * @param {Object} env
 */
Builder.prototype.addEnvironment = function (env) {
  if (!env.setUp || !env.tearDown) {
    throw new Error('Environment constructor must have setUp and tearDown methods')
  }

  this._environmentProviders.push(function () {
    return env
  })
}



/**
 * Call as:
 * builder.addEnvironmentConstructor(Environment)
 * where 'Environment' is a constructor with 2 prototype properties: setUp and tearDown.
 *
 * The environment will be invoked during setUp/tearDown
 *
 * @param {Function} Ctor
 */
Builder.prototype.addEnvironmentConstructor = function (Ctor) {
  if (!Ctor.prototype.setUp || !Ctor.prototype.tearDown) {
    throw new Error('Environment constructor must have setUp and tearDown methods')
  }

  this._environmentProviders.push(function () {
    return new Ctor()
  })
}


/**
 * @param {Function} done
 * @private
 */
Builder.prototype._defaultSetUpTearDown = function (done) {
  done()
}


/**
 * Create and setUp all the environments in order, then run the wrapped
 * setUp function.
 * @param {Function} done
 * @private
 */
Builder.prototype._setUp = function (done) {
  var i = 0
  var advance = function () {
    var envProvider = this._environmentProviders[i++]
    if (!envProvider) {
      return null
    }

    var env = envProvider()
    this._activeEnvironments.push(env)
    var promise = env.setUp()
    if (_isPromiseLike(promise)) {
      return promise.then(advance)
    } else {
      return advance()
    }
  }.bind(this)


  Q.resolve(true).then(advance).then(function () {
    var promise = this._wrappedSetUp.call(this._thisObj, done)
    if (_isPromiseLike(promise)) {
      return promise.then(done)
    }
    return null
  }.bind(this))
  .fail(function (e) {
    console.error(_getErrorString(e))
  })
  .done()
}


/**
 * Tear down all the environments in reverse order, then run the wrapped
 * tearDown function.
 * @param {Function} done
 * @private
 */
Builder.prototype._tearDown = function (done) {
  var advance = function () {
    var env = this._activeEnvironments.pop()
    if (!env) {
      return null
    }

    var promise = env.tearDown()
    if (_isPromiseLike(promise)) {
      return promise.then(advance)
    } else {
      return advance()
    }
  }.bind(this)


  Q.resolve(true).then(advance).then(function () {
    var promise = this._wrappedTearDown.call(this._thisObj, done)
    if (_isPromiseLike(promise)) {
      return promise.then(done)
    }
    return null
  }.bind(this))
  .fail(function (e) {
    console.error(_getErrorString(e))
  })
  .done()
}

function nullFunction() {}

/**
 * Run a test function
 *
 * @param {Function} fn The function
 * @param {NodeUnit} test The nodeunit test object.
 */
function runTestFunction(fn, test) {
  try {
    // Preserve the 'this' context.
    var p = fn.call(this, test)

    // If this looks like a promise, attach all the appropriate handlers
    if (_isPromiseLike(p)) {
      p.then(nullFunction, function (e) {
        _printError(test, e)
      })
      .then(function () {
        test.done()
      })
    }
  } catch (e) {
    _printError(test, e)
    test.done()
  }
}

function _isPromiseLike(obj) {
  return obj && obj.then && (typeof obj.then == 'function')
}

function _printError(test, e) {
  test.ok(false, _getErrorString(e))
}

function _getErrorString(e) {
  if (e && e.stack) {
    return String(e.stack)
  } else {
    return util.inspect(e, true, 5)
  }
}

// Nodeunit doesn't properly report uncaught errors, so we do this ourselves.
// In the worst case scenario, we'll report the error twice.
process.addListener('uncaughtException', function (err) {
  _printError(assert, err)
})

module.exports = Builder

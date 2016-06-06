// Copyright 2014. The Obvious Corporation.

var Q = require('q')
var Builder = require('../nodeunitq').Builder
var util = require('util')

exports.testBasicEnvironment = function (test) {
  var logs = []

  // Create environments that simply log what they do.
  var LogEnvironment = function (name) {
    this._name = name
  }
  LogEnvironment.prototype.setUp = function () {
    logs.push('setUp ' + this._name)
  }
  LogEnvironment.prototype.tearDown = function () {
    logs.push('tearDown ' + this._name)
  }

  var EnvironmentA = function() { LogEnvironment.call(this, 'A') }
  util.inherits(EnvironmentA, LogEnvironment)

  var EnvironmentB = function() { LogEnvironment.call(this, 'B') }
  util.inherits(EnvironmentB, LogEnvironment)

  var fakeExports = {}
  var builder = new Builder(fakeExports)
  builder.addEnvironmentConstructor(EnvironmentA)
  builder.addEnvironmentConstructor(EnvironmentB)

  fakeExports.setUp = function () {
    return Q.resolve(true).then(function () {
      logs.push('setUp wrapped')
    })
  }

  fakeExports.tearDown = function () {
    return Q.resolve(true).then(function () {
      logs.push('tearDown wrapped')
    })
  }

  // create a defer that will complete when setUp finishes
  var defer = Q.defer()
  var logDone = function () {
    logs.push('done')
    defer.resolve(true)
  }

  fakeExports.setUp(logDone)

  defer.promise.then(function () {
    test.deepEqual(['setUp A', 'setUp B', 'setUp wrapped', 'done'], logs)

    // reset state
    logs.length = 0
    defer = Q.defer()

    // kick off tearDown
    fakeExports.tearDown(logDone)
    return defer.promise
  })
  .then(function () {
    test.deepEqual(['tearDown B', 'tearDown A', 'tearDown wrapped', 'done'], logs)

    test.done()
  })
  .done()
}

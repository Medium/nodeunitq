
var Q = require('Q')
var Builder = require('../nodeunitq').Builder

exports.testErrors = function (test) {
  var builder = new Builder({})
  try {
    builder.add('x', 'x')
    test.ok(false, 'expected error')
  } catch (e) {}

  try {
    builder.add(function () {})
    test.ok(false, 'expected error')
  } catch (e) {}

  try {
    builder.add(function test1() {})
    builder.add('test1', function () {})
    test.ok(false, 'expected error')
  } catch (e) {}

  try {
    builder.add('test2', function () {})
    builder.add(function test2() {})
    test.ok(false, 'expected error')
  } catch (e) {}

  builder.add(function test3() {})
  test.done()
}


exports.testPromise = function (test) {
  var builder = new Builder({})
  builder.add(function test1(test) {
    return Q(1)
  })

  builder._exports['test1'](test)
}

exports.testError = function (test) {
  var builder = new Builder({})
  builder.add(function test1(test) {
    throw new Error('abc')
  })

  var failure = null
  var doneCalled = false
  builder._exports['test1']({
    ok: function (falsey, msg) {
      test.ok(!falsey)
      failure = msg
    },
    done: function() {
      doneCalled = true
    }
  })
  test.notEqual(-1, failure.indexOf('abc'))
  test.ok(doneCalled)
  test.done()
}

var builder = new Builder(exports)
builder.add(function testError2() {
  throw Error()
})

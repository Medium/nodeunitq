// Copyright 2013. The Obvious Corporation.

var Q = require('q')
var Builder = require('../nodeunitq').Builder

var builder = new Builder(exports)

var thisObj

exports.setUp = function (done) {
  thisObj = this
  done()
}

exports.testThisObjPlain = function (test) {
  test.equal(thisObj, this)
  test.done()
}

builder.add(function testThisObjAddedFunction(test) {
  test.equal(thisObj, this)
  return Q.resolve(true)
})

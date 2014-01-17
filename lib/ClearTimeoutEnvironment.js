// Copyright 2014. The Obvious Corporation.

/**
 * An environment that clears all timeouts/intervals at the end of each test.
 * @constructor
 */
function ClearTimeoutEnvironment() {
  /** @private {Array} */
  this._timeouts = []

  /** @private {Array} */
  this._intervals = []

  /** @type {Function} */
  this._originalSetTimeout = null

  /** @type {Function} */
  this._originalSetInterval = null
}

/** Record all setTimeout/setInterval IDs. */
ClearTimeoutEnvironment.prototype.setUp = function () {
  this._originalSetTimeout = global.setTimeout
  global.setTimeout = function (fn, timeout) {
    this._timeouts.push(this._originalSetTimeout.call(global, fn, timeout))
  }.bind(this)

  this._originalSetInterval = global.setInterval
  global.setInterval = function (fn, interval) {
    this._intervals.push(this._originalSetInterval.call(global, fn, interval))
  }.bind(this)
}

/** Clear all setTimeout/setInterval IDs. */
ClearTimeoutEnvironment.prototype.tearDown = function () {
  global.setTimeout = this._originalSetTimeout
  global.setInterval = this._originalSetInterval

  this._timeouts.forEach(clearTimeout)
  this._intervals.forEach(clearInterval)
}

module.exports = ClearTimeoutEnvironment

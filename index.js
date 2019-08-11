'use strict'

const { Pgsqlize } = require('./lib')

// test
const a = new Pgsqlize()
class b extends a.Model {
  constructor() {
    super({})
  }
}

module.exports = { Pgsqlize }
module.exports.Pgsqlize = Pgsqlize
module.exports.default = Pgsqlize

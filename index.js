'use strict'

const { Pgraphql } = require('./lib')

const a = new Pgraphql('ss', '1122', 'dd', '12')

module.exports = { Pgraphql }
module.exports.Pgraphql = Pgraphql
module.exports.default = Pgraphql

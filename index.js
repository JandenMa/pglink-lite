'use strict'

const { PgLink } = require('./lib')

// test
const inst = new PgLink({
  host: 'http://192.168.1.100',
  port: 5432,
  useName: 'root',
  password: '123456',
  database: 'test'
})
class b extends inst.Model {
  constructor(params) {
    super({ tableName: 'companies', pkName: 'id', params })
  }
}

module.exports = { PgLink }
module.exports.PgLink = PgLink
module.exports.default = PgLink

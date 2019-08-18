'use strict'

const { Connection } = require('./lib/core/connection')
const { ModelImpl } = require('./lib/model')
const { DataType } = require('./lib/dataType')

class PgLink {
  /**
   * @param {{host:string,port:number,userName:string,password:string,database:string,connectionMax:number}} args
   */
  constructor(args) {
    const connection = Connection(args)
    this.Model = ModelImpl(connection)
    this.DataTypes = DataType
  }
}

module.exports = { PgLink }
module.exports.PgLink = PgLink
module.exports.default = PgLink

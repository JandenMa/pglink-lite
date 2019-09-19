'use strict'

const { Connection } = require('./lib/core/connection')
const { ModelImpl } = require('./lib/model')
const { DataType } = require('./lib/dataType')

class PgLink {
  /**
   * @param {{host:string,port:number,userName:string,password:string,database:string,connectionMax:number,globalAutoSetTimeFields:Array<striing>}} args
   */
  constructor(args) {
    const {
      host,
      port,
      password,
      userName,
      database,
      connectionMax,
      globalAutoSetTimeFields = [] // v0.1.8 for whole app to use
    } = args
    const connection = Connection({
      host,
      port,
      password,
      userName,
      database,
      connectionMax
    })
    this.Model = ModelImpl(connection, globalAutoSetTimeFields)
    this.DataTypes = DataType
  }
}

module.exports = { PgLink }
module.exports.PgLink = PgLink
module.exports.default = PgLink

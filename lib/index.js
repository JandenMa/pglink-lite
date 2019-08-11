'use strict'

const { Connection } = require('./core/connection')
const { DataType } = require('./dataType/dataType/dataType')
const { ModelImpl } = require('./model')

class Pgsqlize {
  /**
   * @param {{host:string,port:number,userName:string,password:string,database:string,connectionMax:number}} args
   */
  constructor(args) {
    const connection = Connection(args)
    this.Model = ModelImpl(connection)
  }
  static DataType = DataType
}

module.exports = { Pgsqlize }
module.exports.Pgsqlize = Pgsqlize
module.exports.default = Pgsqlize

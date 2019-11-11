# pglink-lite

> A library for Postgresql to use ORM on NodeJS with GraphQL
>
> Via _Janden Ma_
>
> MIT LICENCE

_This library is built for who uses GraphQL on NodeJS, you can use model to operate data._

## Version Change Logs

- **Build20190812 :** Prepared version
- **Build20190819 :** Beta version
- **Build20190826 :** Fix bugs.
- **Build20190829 :** Add multi insert and update functions.
- **Build20190917 :**
  - `MultiUpdateWithConditions` bug fixes.
  - Supports all update functions in model to set the fields, which need to update to current time automatically, when updated.
- **Build20190919 :** Supports set global parameter `globalAutoSetTimeFields`
- **Build20190924 :**
  - Changed `tableName` and `returnTableName` in `Transaction` to `alias` and `returnWithAlias`
  - Added `Execute` function in `dataAccess` to run a single query
  - Bug fixes
  - Optimized something

---

## Installation

- npm

  ```bash
  npm i pglink-lite --save
  ```

- yarn

  ```bash
  yarn add pglink-lite --save
  ```

---

## Quick Example

- Instance (_core/pglink.js_)

  ```javascript
  // core/pgsqlize.js
  const { PgLink } = require('pglink-lite')

  const pglink = new PgLink({
    host: 'http://192.168.1.100',
    port: 5432,
    userName: 'root',
    password: '123456',
    database: 'test',
    globalAutoSetTimeFields: ['updatedAt']
  })

  module.exports.default = pglink
  ```

- Model (_models/users.js_)
  - #####Notes on Authorization:
  - Permission objects take three properties:
    - authFields: An array of either strings or objects. Strings should be the name of the column to be compared with the user's authorization information. For instance 'companyId' or 'employeeId'. An object is used to match a column name in the record to a different property in the permissions. For example, to match the 'id' field of an employee to the 'employeeId' field in the user authorization data, pass { employeeId: 'id' }
    - scope: The granularity of permissions required to perform an operation on this model. For instance, a read operation on an employee garnishment should be scope 'EMPLOYEE', but a write operation on the same should be scope 'COMPANY', since the employee should be able to see their own garnishments, but only someone with write permissions to the company's data should be allowed to create a new garnishment.
    - operation: 'READ' or 'WRITE' - self explanatory
  - To indicate that an operation should not require authorization, pass { auth: false } as the permission parameter to the BaseModel method
  - When the input data for a read or update operation does not or does not always include the companyId, use updateBy or findBy and pass companyId: this.companyId to the conditions object.

  - ####Notes on the BaseModel
    - The purpose of the base model is to add a layer of abstraction between pgLink and child models, allowing operations like adding the companyId to create data by default, and authorizing all operations.
    - To avoid confusion and potential bugs, pgLink operations should only be called by the BaseModel, and BaseModel operations should be called by child models using super. Resolvers and other classes should not call pgLink methods nor BaseModel methods directly.
    - BaseModel methods return the most common type for that operation. i.e. findBy will always return an array, however some methods in child models use findBy but must return a single record. Parsing should happen in the child model so that the BaseModel remains sufficiently generalized.
    - If you want to add middleware functionality, such as adding companyId to create data, be sure to include a way to turn the operation off for classes that don't need it. For example, including noAuthor: true or noCompanyId: true in the config object for a child model will disable adding createdBy/updatedBy or companyId to data automatically respectively.
    - Conditions in xBy methods are flexible. See the below examples:
      - { id: 3 } -- "id" = 3
      - { id: [1, 2, 3] } -- "id" IN ( 1, 2, 3 )
      - { createdAt: { operator: '>', value: `DATE(${startDate})` } } -- "createdAt" > DATE('01/01/2019')



  ```javascript
  // models/users.js
  import { BaseModel } from './BaseModel'

  class UserModel extends BaseModel {
    constructor() {
      super({ tableName: 'users', pkName: 'userId', defaultPermission: {authFields: ['employeeId', 'companyId'], scope: 'COMPANY'} })
    }
  }

  module.exports.default = UserModel
  ```

- Schema (_schemas/users.js_)

  ```javascript
  // schemas/users.js
  // you need to install something for gql first, we use apollo-server here
  const { gql } = require('apollo-server')

  const typeDefs = gql`
    type User {
      userId: ID!
      userName: String
      status: Boolean
    }
  
  	input UserInsertInput {
      userName!: String
  	}
  
  	input UserEditInput {
      userId!: ID
      userName: String
      status: Boolean
  	}
  
  	type Query {
  		getUserById(userId: ID!): User
  	}
  
  	type Mutation	{
  		insertUser(user: UserInsertInput): User
  		editUser(user: UserEditInput): User
  	}
  `
  module.exports.default = typeDefs
  ```

- Resolver (_resolvers/users.js_)

  ```javascript
  // resolvers/users.js
  const UserModel = require('../models/users.js')

  const getUserById = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.findByPk(args.userId)
    return res
  }

  const insertUser = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.insertOne({ ...args.user })
    return res
  }

  const editUser = async (_, args) => {
    const inst = new UserModel()
    const res = await inst.updateByPk({ ...args.user })
    return res
  }

  module.exports = {
    getUserById,
    insertUser,
    editUser
  }
  ```

---

## Usage

- **Import library package**

  ```javascript
  import { PgLink } from 'pglink-lite'
  // or
  import PgLink from 'pglink-lite'
  // or
  const { PgLink } = require('pglink-lite')
  // or
  const PgLink = require('pglink-lite')
  ```

- **Instantiate `PgLink`**

  ```javascript
  export const pglink = new PgLink({
    host: 'http://192.168.1.100',
    port: 5432,
    userName: 'root',
    password: '123456',
    database: 'test'
  })
  ```

  - Props: `object`

    | Key                     | Type            | Introduction                                                                   | Default value |
    | ----------------------- | --------------- | ------------------------------------------------------------------------------ | ------------- |
    | host                    | `string`        | Postgresql server host                                                         | "localhost"   |
    | port                    | `number`        | Postgresql server port                                                         | 5432          |
    | userName                | `string`        | Postgresql server user name                                                    | "postgres"    |
    | password                | `string`        | Postgresql server password                                                     | ""_(empty)_   |
    | database                | `string`        | Postgresql database name                                                       | "postgres"    |
    | connectionMax           | `number`        | Postgresql database max connection                                             | 10            |
    | globalAutoSetTimeFields | `Array<string>` | To define fields that should be automatically updated with a current timestamp | []            |

- **Inherit and declare model**

  ```javascript
  // example
  class xxxModel extends pglink.Model {
    constructor(params) {
      super({
        tableName: 'users',
        pkName: 'No',
        enumMapping: {
          sex: { MALE: 1, FAMALE: 0 },
          role: { STUDENT: 1, TEACHER: 2 }
        }
      })
    }
    // if you need rewrite inner funtions or add some functions, write here
  }
  ```

  - constructor props : `object`

  | Key         | Type     | Introduction                                                                                         | Required |
  | ----------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- |
  | tableName   | `string` | the data table in postgresql you need to operate                                                     | true     |
  | pkName      | `string` | the name of primary key in the data table, default `id`                                              | false    |
  | enumMapping | `object` | to defined the key and value, key should be included in the fields, e.g. {role: {ADMIN: 0, USER: 1}} | false    |

  - inner properties or functions

    1. **dataAccess**

       - Introduction

         A data table operator (CRUD)

       - see the details below

    2. **findAll**

       - Introduction

         A function for querying all rows from one table

       - Parameters

         null

       - Returns

         (Promise) All rows data or error

    3. **findByPk**

       - Introduction

         A function for querying by primary key

       - Parameters

         `pkValue`: string | number

         `selectFields`: string, default \*

       - Returns

         (Promise) One row data or error

    4. **findByConditions**

       - Introduction

         A function for querying by conditions

       - Parameters

         `whereClause`: string. (e.g. ' name = "Tim" ')

         `selectFields`: string, default \*

       - Returns

         (Promise) Some rows data or error

    5. **InsertOne**

       - Introduction

         A function for inserting one row to a table

       - Parameters

         `params`: object. (data from resolver)

       - Returns

         (Promise) Inserted row data or errors

    6. **multiInsert**

       - Introduction

         A function for inserting multi rows to a table

       - Parameters

         `items`: Array\<object\>. (data from resolver)

       - Returns

         (Promise) Inserted rows data or errors

    7. **updateByPk**

       - Introduction

         A function for updating by primary key

       - Parameters

         `params`: object. (data from resolver, have to include pkName and pkValue)

         `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

       - Returns

         (Promise) updated row data or errors

    8. **updateByConditions**

       - Introduction

         A function for updating by conditions

       - Parameters

         `params`: object. (data from resolver)

         `whereClause`: string. (e.g. ' name = "Tim" ')

         `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

       - Returns

         (Promise) updated rows data or errors

    9. **multiUpdateWithConditions**

       - Introduction

         A function for multi updating by conditions

       - Parameters

         `items`: Array\<object\>. (data from resolver)

         `whereClause`: string with replacements. (e.g. ' company = \$1 ')

         `replacementFields`: Array\<string\> (e.g. ['company'])

         `autoSetTimeFields`: Those fields need to set time automatically, should be included in items

       - Returns

         (Promise) Updated rows data or errors

    10. **deleteByConditions**

        - Introduction

          A function for deleting by conditions

        - Parameters

          `whereClause`: string. (e.g. ' "companyId" = 1001 ')

        - Returns

          (Promise) Deleted rows data or errors

    11. **encodeFromEnum**

        - Introduction

          A function for encoding the enum to integer value

        - Parameters

          `data`: object | Array. (input data)

        - Returns

          (Object) Same structure of input data, with encoded enum

    12. **decodeToEnum**

        - Introduction

          A function for decoding the enum from integer value

        - Parameters

          `data`: object | Array. (output data)

        - Returns

          (Object) Same structure of output data, with decoded enum

  - `dataAccess` functions

    1. **Execute**

       - Introduction

         to run a single and simple sql

       - Parameters:

         - sql: string

       - Returns

         reponse from database

    2. **Transaction**

       - Introduction

         core function with transaction

       - Parameters:

         ```javascript
         args: {
             params: Array<{
             sql: string
               replacements?: Array<any>
             alias?: string // to distinguish responses
             }>
           returnWithAlias?: boolean // if true, return res with alias
          },
         transaction: Function // callback function or Transaction
         ```

       - Returns

       reponse from database

  3. **GenerateInsertSQL**

     - Introduction

       generate insert sql object

     - Parameters

     ```javascript
         params: object, //data from resolver, includes inserted fields and values
       tableName: string //name of inserted table
     ```

     - Returns

       ```javascript
       {
           sql: string
           replacement: Array<any>
           tableName: string
        }
       ```

  4. **GenerateMultiInsertSQL**

     - Introduction

       generate bulk insert sql object

     - Parameters

       ```js
       insertFields: Array<string>,
         params: object, //data from resolver, includes inserted fields and values
       tableName: string //name of inserted table
       ```

     - Returns

       ```javascript
       {
           sql: string
           replacement: Array<any>
           tableName: string
        }
       ```

  5. **GenerateUpdateSQL**

     - Introduction

       generate update sql object

     - Parameters

     ```javascript
        {
         /** an object includes the fields and values you want to update */
           params: object
           /** the name of table */
           tableName: string
           /** e.g. "employeeId" = '123' */
           whereClause?: string
           /** the name of primary key, default 'id' */
           pkName?: string
         /** those fields need to set time automatically, default value is from globalAutoSetTimeFields. We will check whether fields included in the table, if not, skip */
           autoSetTimeFields?: Array<string>
      }
     ```

     - Returns

       ```javascript
       {
           sql: string
           replacement: Array<any>
           tableName: string
        }
       ```

     ```

     ```

  6. **InsertExecutor**

     - Introduction

       execute insert sql

     - Parameters

       ```js
          params: object, //data from resolver, includes inserted fields and values
        tableName: string //name of inserted table
       ```

       - Returns

         response from database

  7. **MultiInsertToOneTableExecutor**

     - Introduction

       execute insert sqls to one table

     - Parameters

       ```js
        insertFields: Array<string>,
          params: object, //data from resolver, includes inserted fields and values
        tableName: string //name of inserted table
       ```

     - Returns

       response from database

  8. **MultiInsertExecutor**

  - Introduction

    execute insert sqls to deferent tables

  - Parameters

    ```javascript
       Array<
     {
          params: object, //data from resolver, includes inserted fields and values
        tableName: string //name of inserted table
       }
     >
    ```

    - Returns

      response from database

  9. **UpdateByPkExecutor**

     - Introduction

       execute update sql by primary key

     - Parameters

       ```javascript
        params: object, //data from resolver, includes updated fields and values
        tableName: string, //name of inserted table
        pkName?: string, //the name of primary key
        autoSetTimeFields?: Array<string> //those fields need to set time automatically
       ```

     - Returns

       response from database

  10. **UpdateExecutor**

  - Introduction

  execute update sql by conditions

  - Parameters

    ```javascript
      params: object, //data from resolver, includes updated fields and values
    tableName: string, //name of inserted table
      whereClause?: string, //e.g. "employeeId" = '123'
      autoSetTimeFields?: Array<string> //those fields need to set time automatically
    ```

    - Returns

      response from database

  11. **MultiUpdateExecutor**

      - Introduction

        execute bulk update sqls by conditions

      - Parameters

        ```javascript
        Array<
          {
          	params: object, //data from resolver, includes updated fields and values
        		tableName: string, //name of inserted table
        		whereClause?: string //e.g. "employeeId" = '123'
        		pkName: string, //the name of primary key
            autoSetTimeFields?: Array<string> //those fields need to set time automatically
        }
        >
        ```

      - Returns

        response from database

  12. **DeleteExecutor**

      - Introduction

        execute delete sql by conditions

      - Parameters

        ```javascript
        tableName: string, //name of inserted table
        whereClause?: string //e.g. "employeeId" = '123'
        ```

      - Returns

        response from database

  13. **SingleQueryExecutor**

      - Introduction

        execute query sql

      - Parameters

        ```javascript
         {
             /** the name of table */
             tableName: string
             /** e.g. "employeeId" = '123' */
             whereClause: string
             /** the fields what you want to select, default * */
             selectFields?: string
             /** the field name for sorting, e.g.: 'id DESC' */
             sortBy?: string
             /** to limit the count of rows you want to query */
             limit?: number
             /** how many rows you want to skip */
           	offset?: number
          }
        ```

      - Returns

        response from database

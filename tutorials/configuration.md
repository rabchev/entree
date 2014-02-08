The following table describes the elements considered at the first level of the configuration document/object:

| Key                           | Type      | Description                                                                           |
|-------------------------------|-----------|---------------------------------------------------------------------------------------|
| [connections](#connections)   | `Object`  | A collection of connection settings.                                                  |
| defaultConnection             | `String`  | Sets the default connection for the instance. Defaults to "fs-default".               |
| [schema](#schema)             | `Objec`   | Defines persistent objects, relations, mapping and indexes.                           |
| [collections](#collections)   | `Array`   | An array of data collection settings.                                                 |
| [replicas](#replicas)         | `Array`   | An array of replica set definitions.                                                  |
| [shards](#shards)             | `Array`   | An array of shard definitions.                                                        |
| [environments](#environments) | `Object`  | A collection of objects, each representing an environment. An environment can contain any of the above elements. |

Elements are processed in the order listed above.

### <a name='connections'></a> Connections

The following table describes connection settings:

| Key                           | Type      | Description                                                                           |
|-------------------------------|-----------|---------------------------------------------------------------------------------------|
| provider                      | `String`  | The name of a built-in or external data provider or the path to a custom provider.    |
| options                       | `Object`  | Provider specific configuration options. However, it must provide `connStr` value.    |

Every instance has one predefined connection which has the following settings:
```javascript
    {
        connections: {
            "fs-default": {
                provider: "file-system",
                options: {
                    connStr: "./data" // relative to process.cwd()
                }
            }
        }
    }
```

### <a name='schema'></a> Schema

**TODO:** Schema support is not fully implemented yet.

Example:
```javascript
    {
        schema: {
            "user": {
                "__identifier__": "username",
                username: { type: String, index: true},
                email: String,
                age: Number
            },
            "comment": {
                "__identifier__": "_id",
                title: Stirng,
                message: String
            }
        }
    }
```

### <a name='collections' Collections

The following table describes connection settings:

| Key                           | Type      | Description                                                                           |
|-------------------------------|-----------|---------------------------------------------------------------------------------------|
| name                          | `String`  | The name of the data collection. The name must be unique within a Manger instance.    |
| connection                    | `String`  | Specifies which connection should be used to store and retrieve data. If omitted the default connection will be used.  |
| interceptors                  | `Array`   | An array of interception settings to attach to the collection.                        |

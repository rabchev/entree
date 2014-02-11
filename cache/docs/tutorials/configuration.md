The following table describes the elements considered at the first level of the configuration document / object:

| Key                           | Type      | Description
|-------------------------------|-----------|---------------------------------------------------------------------------------------
| [connections](#connections)   | `object`  | A collection of connection settings.
| defaultConnection             | `string`  | Sets the default connection for the instance. Defaults to "fs-default".
| [schema](#schema)             | `object`  | Defines persistent objects, relations, mapping and indexes.
| [collections](#collections)   | `object[]`| An array of data collection settings.
| [replicas](#replicas)         | `object[]`| An array of replica set definitions.
| [shards](#shards)             | `object[]`| An array of shard definitions.
| [environments](#environments) | `object`  | A collection of objects, each representing an environment. An environment can contain any of the above elements.

*Elements are processed in the order listed above.*

<a name='connections'>&nbsp;</a>

### Connections

The following table describes connection settings:

| Key                           | Type      | Description
|-------------------------------|-----------|---------------------------------------------------------------------------------------
| provider                      | `string`  | The name of a built-in or external data provider or the path to a custom provider.
| options                       | `object`  | Provider specific configuration options. However, it must provide `connStr` value.
| [interceptors](#interceptors) | `object[]`| An array of interception settings to attach to every data collection using this connection.

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

<a name='schema'>&nbsp;</a>

### Schema

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

<a name='collections'>&nbsp;</a>

### Collections

The following table describes collection settings:

| Key                           | Type      | Description
|-------------------------------|-----------|---------------------------------------------------------------------------------------
| name                          | `string`  | The name of the data collection. The name must be unique within a Manger instance.
| connection                    | `string`  | Specifies which connection should be used to store and retrieve data. If omitted the default connection will be used.
| schema                        | `string`  | Maps the collection to data model schema.
| [interceptors](#interceptors) | `object[]`| An array of interception settings to attach to the collection.

<a name='interceptors'>&nbsp;</a>

### Interceptors

The following tabel describes interceptor settings:

| Key                           | Type      | Description
|-------------------------------|-----------|---------------------------------------------------------------------------------------
| interceptor                   | `string`  | The name of a built-in or external interceptor or the path to a custom interceptor.
| disable                       | `boolean` | If set to true, causes the interceptor to be ignored.
| options                       | `object`  | Interceptor implementation specific configuration options.

**IMPORTANT:** The order of which the interceptors are defined is vital for their proper functioning.

Interceptors defined on connection level are automatically attached to all collections using that connection, prior to interceptors defined on the collection level. It is possible to avoid an interceptor for a specific collection even if it was defined on the connection level by setting disable property to true.

Please see the {@tutorial interceptors} tutorial for more details.

Example:
```javascript
    {
        "interceptors": [
            {
                "interceptor": "cache",
                "disable": false,
                "options": {
                    "stores": [
                        { "store": "memory", "max": 1000, "ttl": 10 }
                    ],
                    "actions": ["get", "select"]
                }
            }
        ]
    }
```

<a name='replicas'>&nbsp;</a>

### Replica Sets

The following tabel describes replicas settings:

| Key                           | Type      | Description
|-------------------------------|-----------|---------------------------------------------------------------------------------------
| name                          | `string`  | The name of the replica set. The name must be unique within a Manger instance.
| collections                   | `string[]`| An array of collection names, the ones that will constitute the replica set.
| options                       | `object`  | Additional options for the replica set.

**IMPORTANT:** Replica sets are accessed and treated just like regular data collections. Therefore, their names should be unique altogether within collections and shards.

Please see the {@tutorial replicas} tutorial for more details.

Example:
```javascript
    {
        "replicas": [
            {
                "name": "comments",
                "collections": ["comments-mongo-hq", "comments-local"],
                "options": {
                    "master": "comments-mongo-hq",
                    "wait": "master"
                }
            }
        ]
    }
```

<a name='shards'>&nbsp;</a>

### Shards

**TODO:** In progress.

Please see the {@tutorial sharding} tutorial for more details.

<a name='environments'>&nbsp;</a>

### Environments

The environments collection contains groups of settings that are applied only if NODE_ENV environment variable matches the settings group name.

Consider the following example:
```javascript
    {
        "defaultConnection": "main-data",
        "connections": {
            "main-data": {
                "provider": "file-system",
                "options": {
                    "connStr": "./data"
                }
            }
        },
        "environments": {
            "testing": {
                "connections": {
                    "main-data": {
                        "provider": "mongodb",
                        "options": {
                            "connStr": "mongodb://test-db.domain.com"
                        }
                    }
                }
            },
            "production": {
                "connections": {
                    "main-data": {
                        "provider": "mongodb",
                        "options": {
                            "connStr": "mongodb://db.domian.com"
                        }
                    }
                }
            }
        }
    }
```

In the example above: if the **$NODE_ENV** environment variable equals "testing", than the **connStr** for "main-data" connection will be "mongodb://test-db.domain.com".
If **NODE_ENV** is not set or it doesn’t match any of the environment groups, than the configuration that is outside of the "environments" collection will take place.

Matching elements inside environments are merged with the once that are outside. This allows you to configure only the properties which values differ.

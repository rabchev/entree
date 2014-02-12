When {@link Manager#configure} method is called for the first time, even without any arguments,
a data collection named "config" is created. By default this collection uses "fs-default" connection,
the file system provider, to store and retrieve configuration information about other data store connections,
data collections, database schemas and etc.

This data collection is intended store application configurations.

The following example demonstrates how the default settings for the "config" collection can be changed:
```javascript
    var opts = {
        config: {
            modelDocument: "my-model",
            connection: {
                name: "mongo-local",
                provider: "mongodb",
                options: {
                    connStr: "mongodb://localhost/db2"
                }
            }
        }
    }

    entree.configure(opts);
```

The code above will add new connection named "mongo-local" and it will create the "config"
collection using that connection. Than, the {@link Manager} will search for a document with ID "my-model" to
load configuration information.

The following table describes the properties of the `config` element in the above example:

| Key                   | Type                  | Description
|-----------------------|-----------------------|----------------------------------------------------------------
| modelDocument         | `string`              | The ID of the document holding the configuration. Defaults to "data-model".
| connection            | `string` &#124; `object`  | Defines the data store connection for the `config` data collection.

If "connection" element is a string, it specifies which connection should be used from the {@link Manager#connections} collection.
In that case the connection should already be present; otherwise an error will be thrown.

Otherwise, it should be an object providing all the required settings to create a new connection.

Alternatively, it is possible to directly create new connection by providing all the necessary settings like in the example above.
Please see {@tutorial configuration} tutorial for more information on configuring data store connections.

When {@link Manager#configure} method is called for the first time, even without any arguments,
a data collection named "config" is created. By default this collection uses "fs-default" connection,
the file system provider, to store and retrieve configuration information about other database connections,
data collections, schema and etc.

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
| modelDocument         | `string`              |
| connection            | `string` or `object`  |

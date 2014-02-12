Interceptors are pluggable modules that can interact with the following data provider (collection) methods:

 - {@link Provider#insert}
 - {@link Provider#upsert}
 - {@link Provider#update}
 - {@link Provider#delete}
 - {@link Provider#get}
 - {@link Provider#select}

Interceptors work very similarly to Connect middleware. They use the same concept to allow pluggable
modules to alter the input arguments and the output result of the intercepted methods.
They operate at the lowest possible level above the native drivers, which makes them suitable place for cross-cutting concerns
logic such as data access authorization, caching and logging.

Bundled interceptors:

 - {@link module:cache} - Allows multi-tiered caching of results.
 - {@link module:log}   - Allows logging of activities and performance.

External interceptors:

 - [AuthorityJS](http://rabchev.github.io/authority/) - Allows authorization of method calls via predefined rules or ACL.

Example:
```javascript
    var entree  = require("entree"),
        cache     = entree.resolveInterceptor("cache"),
        stores    = [
            { store: "memory", max: 1000, ttl: 10 },
            { store: require("./redis_store"), db: 0, ttl: 100 }
        ];

    entree.posts.use(cache.interception(stores, ["get"]));
```

### Custom Interceptors

// TODO: Explain custom interceptors. [2014-01-12]

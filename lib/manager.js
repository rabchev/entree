/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    Context     = require("./context"),
    Err         = require("./error"),
    _           = require("lodash"),
    async       = require("async"),
    util        = require("util"),
    path        = require("path");

function mergeConnectons(man, source) {
    if (source) {
        _.merge(man.connections, source);
    }
}

function mergeSchemas(man, source) {
    if (source) {
        _.merge(man.schema, source);
    }
}

function mergeInterceptors(src1, src2) {
    var res = src1 ? src1.concat() : [], item, i;

    if (src2) {
        for (i = 0; i < src2.length; i++) {
            item = src2[i];
            _.remove(res, { interceptor: item.interceptor });
            res.push(item);
        }
    }
    return res;
}

function mergeCollections(man, colls, done) {
    function addColl(el, cb) {
        var conn = man.connections[el.connection] || man.defaultConnection;
        man.addCollection(el.name, el.connection, mergeInterceptors(conn.interceptors, el.interceptors), el.schema, cb);
    }

    if (colls) {
        async.each(colls, function (el, cb) {
            if (man[el.name]) {
                man.removeCollection(el.name, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    addColl(el, cb);
                });
            } else {
                addColl(el, cb);
            }
        }, done);
    } else {
        done();
    }
}

function mergeReplicas(man, source) {
    // TODO: implement
}

function mergeShards(man, source) {
    // TODO: implement
}

function parseModel(man, model, done) {
    var envModel;
    if (model.environments && model.environments[man.env]) {
        envModel = model.environments[man.env];
    } else {
        envModel = {};
    }

    mergeConnectons(man, model.connections);
    mergeConnectons(man, envModel.connections);
    man.defaultConnection = envModel.defaultConnection || model.defaultConnection || man.defaultConnection;
    mergeSchemas(man, model.schema);
    mergeSchemas(man, envModel.schema);
    async.series([
        function (cb) {
            mergeCollections(man, model.collections, cb);
        },
        function (cb) {
            mergeCollections(man, envModel.collections, cb);
        },
        function (cb) {
            mergeReplicas(man, model.replicas);
            mergeReplicas(man, envModel.replicas);
            mergeShards(man, model.shards);
            mergeShards(man, envModel.shards);
            cb();
        }
    ], done);
}

function setProvider(man, name, connection, interceptors, schema, done) {
    var conn, schm, provider;

    if (!done) {
        done = function (err) {
            if (err) {
                throw err;
            }
        };
    }

    conn = man.connections[connection || man.defaultConnection];
    if (!conn) {
        return done(new Err("NO_SUCH_CONN", [connection]));
    }
    if (schema) {
        if (typeof schema === "string") {
            schm = man.schema[schema];
            if (!schm) {
                return done(new Err("NO_SUCH_SCHEMA", [schema]));
            }
        } else {
            if (!schema.__name__) {
                return done(new Err("REQUIRED_SCHEMA_NAME"));
            }
            if (man.schema[schema.__name__]) {
                return done(new Err("SCHEMA_EXISTS", [schema.__name__]));
            }
            man.schema[schema.__name__] = schm = schema;
        }
    } else {
        schm = {};
    }

    if (!schm.__collName) {
        schm.__collName = name;
    }

    provider = new (man.resolveProvider(conn.provider))(conn.options, schm);

    if (interceptors) {
        interceptors.forEach(function (el) {
            if (typeof el !== "function") {
                if (!el.disable) {
                    var interceptor = man.resolveInterceptor(el.interceptor);
                    el = interceptor.interception.apply(interceptor.interception, el.options);
                }
            }
            provider.use(el);
        });
    }

    provider.name = name;
    man[name] = provider;
    man.collections.push(provider);

    provider.init(done);
}

function parseArgs() {
    var args = {}, i;

    function setArg(arg, idx) {
        if (arg) {
            switch (typeof arg) {
            case "string":
                if (idx === 0) {
                    args.connection = arg;
                } else {
                    args.schema = arg;
                }
                break;
            case "object":
                if (Array.isArray(arg)) {
                    args.interceptors = arg;
                } else {
                    args.schema = arg;
                }
                break;
            case "function":
                args.done = arg;
                break;
            }
        }
    }

    for (i = 0; i < 4; i++) {
        setArg(arguments[i], i);
    }

    return args;
}

function FluentContext(setters, manager, name) {
    this.setters = setters;
    this.manager = manager;
    this.name = name;
}

FluentContext.prototype = {
    setConnection: function (connName) {
        this.connection = connName;
        return this;
    },
    use: function (interceptor) {
        if (!this.interceptors) {
            this.interceptors = [];
        }
        this.interceptors.push(interceptor);
        return this;
    },
    setSchema: function (schema) {
        this.schema = schema;
        return this;
    },
    addCollection: function (name) {
        var that = this;
        this.setters.push(function (cb) {
            setProvider(that.manager, that.name, that.connection, that.interceptors, that.schema, cb);
        });
        return new FluentContext(this.setters, this.manager, name);
    },
    done: function (callback) {
        var that = this;
        this.setters.push(function (cb) {
            setProvider(that.manager, that.name, that.connection, that.interceptors, that.schema, cb);
        });
        async.parallel(this.setters, callback);
        return this.manager;
    }
};

// ****************************************************************************************************************
// Manager Members
// ****************************************************************************************************************

var addConnection = function (name, provider, opts) {
        if (!name) {
            throw new Err("MISSING_ARG", ["name"]);
        }

        if (!provider) {
            throw new Err("MISSING_ARG", ["provider"]);
        }

        if (!opts) {
            throw new Err("MISSING_ARG", ["opts"]);
        }

        if (this.connections[name]) {
            throw new Err("CONN_EXISTS", [name]);
        }

        if (typeof opts === "string") {
            opts = {
                connStr: opts
            };
        }

        var conn = {
            provider: provider,
            options: opts
        };
        this.connections[name] = conn;
        return this;
    },
    removeConnection = function (name) {
        delete this.connections[name];
        return this;
    },
    setCollections = function (name) {
        return new FluentContext([], this, name);
    },
    addCollection = function (name, connection, interceptors, schema, done) {
        if (!name) {
            throw new Err("MISSING_ARG", ["name"]);
        }

        if (this[name]) {
            var err = new Err("PROVIDER_EXISTS", [name]);
            if (done) {
                return done(err);
            }
            throw err;
        }

        var args = parseArgs(connection, interceptors, schema, done);
        setProvider(this, name, args.connection, args.interceptors, args.schema, args.done);
        return this;
    },
    removeCollection = function (name, done) {
        if (!this[name]) {
            var err = new Err("NO_SUCH_PROVIDER", [name]);
            if (done) {
                return done(err);
            }
            throw err;
        }
        delete this[name];
        var provs = _.remove(this.collections, function (item) {
            return item.name === name;
        });

        provs[0].dispose(done || function (err) {
            if (err) {
                throw err;
            }
        });
        return this;
    },
    addProvider = function (provider, name, done) {
        var that = this;
        if (this[name]) {
            var err = new Err("PROVIDER_EXISTS", [name]);
            if (done) {
                return done(err);
            }
            throw err;
        }
        provider.init(function (err) {
            if (!err) {
                provider.name = name;
                that[name] = provider;
                that.collections.push(provider);
            } else if (!done) {
                throw err;
            }
            if (done) {
                done(err);
            }
        });
    },
    dispose = function (done) {
        var that = this;

        function iterator(prov, done) {
            delete that[prov.name];
            prov.dispose(done);
        }

        async.each(_.values(that.collections), iterator, function (err) {
            if (!err) {
                that.collections.length = 0;
            } else if (!done) {
                throw err;
            }
            if (done) {
                done(err);
            }
        });
    },
    resolveProvider = function (name) {
        switch (name) {
        case "file-system":
        case "mongodb":
        case "everlive":
            name = path.join(__dirname, "providers", name);
            break;
        }

        return require(name);
    },
    resolveInterceptor = function (name) {
        switch (name) {
        case "cache":
        case "log":
            name = path.join(__dirname, "interceptors", name);
            break;
        }

        return require(name);
    },
    configure = function (opts, callback) {

        if (typeof opts === "function") {
            callback = opts;
            opts = null;
        }

        if (!callback) {
            callback = function (err) {
                if (err) {
                    throw err;
                }
            };
        }

        // this._opts is deprecated, maintained for backward compatibility only.
        if (!opts) {
            opts = this._opts || {};
        }
        delete this._opts;

        var that = this,
            dataModelDoc,
            confConn;

        this.env = opts.env || process.env.NODE_ENV || "development";

        if (opts.config) {
            dataModelDoc = opts.config.modelDocument;
            if (!dataModelDoc) {
                return callback(new Err("MISSING_CONF_PARAMS"));
            }
            switch (typeof opts.config.connection) {
            case "undefined":
                confConn = this.defaultConnection;
                break;
            case "string":
                confConn = opts.config.connection;
                break;
            case "object":
                this.addConnection(opts.config.name, opts.config.provider, opts.config.options);
                confConn = opts.config.name;
                break;
            default:
                return new Err("Invalid configuration.");
            }
        } else if (!this.config) {
            dataModelDoc = "data-model";
            confConn = this.defaultConnection;
        }

        async.series([
            function (done) {
                if (!dataModelDoc) {
                    return done();
                }

                if (that.config) {
                    that.removeCollection("config", function (err) {
                        if (err) {
                            return done(err);
                        }
                        that.addCollection("config", confConn, done);
                    });
                } else {
                    that.addCollection("config", confConn, done);
                }
            },
            function (done) {
                if (!dataModelDoc) {
                    return done();
                }

                that.config.get(null, dataModelDoc, function (err, model) {
                    if (err) {
                        if (opts.config) {
                            if (err.code === "ITEM_DOESNOT_EXIST") {
                                err = new Err("NO_CONF_FILE");
                            }
                        } else {
                            if (err.code === "ITEM_DOESNOT_EXIST") {
                                err = null;
                            }
                        }
                        return done(err);
                    }

                    parseModel(that, model, done);
                });
            },
            function (done) {
                parseModel(that, opts, done);
            }
        ], callback);

        return this;
    },
    createContext = function (context) {
        return new Context(context);
    };

/**
 * A manager instance acts as an entry point for a group of data collections.
 *
 * @class Represents an Entree instance.
 * @param {object=} opts - Deprecated: Use [configure]{@link Manager#configure} method to setup the instance.
*/
function Manager(opts) {
    /**
     * Specifies the default connection for this instance. The default value is `"fs-default"`.
     */
    this.defaultConnection = "fs-default";

    /**
     * A collection of predefined data storage connections.
     */
    this.connections = {
        "fs-default": {
            provider: "file-system",
            options: {
                connStr: "./data"
            }
        }
    };

    /**
     * A collection of data, index and mapping definitions. Definitions are optional in most cases.
     */
    this.schema = {};

    /**
     * An array containing all established data collections. Individual collections may be connected to different data stores.
     */
    this.collections = [];

    this._opts = opts;
}

/**
 * Adds new data sotrage connection for this instance.
 * Each connection represents a connection to a database or data storage service with specific configuration (options).
 *
 * Every manager instance has one pre-initialized default connection with the following parameters:
 *
 *  - name: "fs-defalut"
 *  - provider: "file-system"
 *  - connection string: "./data" - the path is relative to the `process.cwd()`
 *
 * The default connection can be changed: `entree.defaultConnection = "mongo-default";`
 *
 * @example
 *  var entree = require("entree");
 *
 *  entree.addConnection("fs-default", "file-system", "./data");
 *  entree.addConnection("mongo-default", "mongodb", "mongodb://localhost/entreeTest");
 *  entree.addConnection("mongo-2", "mongodb", { connStr: "mongodb://191.168.0.100/node2" });
 *  entree.addConnection("everlive", "everlive", {
 *      connStr: "http://api.everlive.com/v1/uZEGyZYKiSq5CTSq/",
 *      authorization: "MasterKey PqmmvlWWBF8svReW8p3mkYG9X61nus1w"
 *  });
 *
 * @func
 * @param {string} name - The name of the connection. The name must be unique within a Manger instance.
 * @param {string} provider - This could be the name of a built-in data provider,
 * e.g. `file-system`, `mongodb` and etc., or `require` module implementing custom provider.
 * @param {(string|object)} opts - The configuration information for initializing data provider instances.
 * If this argument is string, it is assumed to be a connection string.
 * This argument is required and at least connection string must be present.
 * @returns {Manger} - This instance.
 */
Manager.prototype.addConnection = addConnection;

/**
 * Removes the specified connection form this instance.
 *
 * @func
 * @param {string} name - The name of the connecton to remove.
 * @returns {Manger} - This instance.
 */
Manager.prototype.removeConnection = removeConnection;

/**
 * Configures a set of data collections using fluent interface.
 *
 * @example
 * manager
 *  .setCollections("users")
 *      .setConnection("mongo-default")
 *      .setSchema({ __name__: "user", name: String, age: Number, roles: Array })
 *      .use(logging)
 *      .use(caching)
 *  .addCollection("comments")
 *      .setConnection("mongo-hq")
 *      .use(caching)
 *  .done(function (err) {
 *      // collections are ready to be used
 *  });
 *
 * @func
 * @param {stirng} name - The name of the first data collection in the set.
 * @returns {FluentContext}
 */
Manager.prototype.setCollections = setCollections;

/**
 * Creates new data colledtion and adds it to this instance.
 *
 * @func
 * @param {string} name - The name of the data collection. The name must be unique within a Manger instance.
 * @param {string=} connection - Specifies which connection should the collection use to store and retrieve data.
 * If omitted the default connection will be used.
 * @param {Array=} interceptors - An array of interceptor function to attach to this collection.
 * @param {(string|object)=} schema - The name of a predefined schema for this colleciton or an object representing the data schema.
 * @param {function=} done - Optional callback that will be called when the collection is initialized.
 * @returns {Manger} - This instance.
 */
Manager.prototype.addCollection = addCollection;

/**
 * Removes the specified data collection from this instance.
 *
 * @func
 * @param {string} name - The name of the collection to remove.
 * @throws Will throw an error if the specified collection does not exist.
 * @returns {Manger} - This instance.
 */
Manager.prototype.removeCollection = removeCollection;

/**
 * Does the same as [addCollection]{@link Manager#addCollection} method, but it accepts data provider instance instead of configuration.
 *
 * @func
 * @param {Provider} provider - An instance of {@link Provider} class.
 * @param {string} name - The name of the data collection. The name must be unique within a Manger instance.
 * @param {function=} done - Optional callback that will be called when the collection is initialized.
 * @returns {Manger} - This instance.
 */
Manager.prototype.addProvider = addProvider;

/**
 * Closes all opened database connections, clears current state and cached data if any.
 * The manager instance can no longer be used after dispose.
 *
 * @func
 * @param {function} done - An optional callback that will be called after the manager is disposed.
 * @returns {null}
 */
Manager.prototype.dispose = dispose;

/**
 * Resolves and loads the specified data provider type.
 *
 * @func
 * @param {string} name - The name of a built-in data provider or path to a custom provider module.
 * @returns {Provider} - An instance of the specified data provider.
 */
Manager.prototype.resolveProvider = resolveProvider;

/**
 * Resolves and loads the specified interception module.
 *
 * @example
 *  var entree = require("entree"),
 *      cache = enree.resolveInterceptor("cache"),
 *      stores    = [
 *          { store: "memory", max: 1000, ttl: 10 },
 *          { store: "redis", db: 0, ttl: 100 }
 *      ],
 *      caching = cache.interception(stores, ["get", "select"]);
 *
 *  entree.addCollection("users", [caching]);
 *
 *  // or add interceptor at later stage
 *  entree.users.use(caching);
 *
 * @func
 * @param {string} name - The name of a built-in interceptor or path to a custom interception module.
 * @returns {module} - An instance of interception module.
 */
Manager.prototype.resolveInterceptor = resolveInterceptor;

/**
 * Sets up the entire infrastructure for the current Entree instance.
 * That includes database connections, data collections, data schemas, interceptors, replica sets and shards.
 * The configuration information can be provided either as an object argument for this method or a configuration document (file) in JSON format.
 * For full description of the configuration format please see the {@tutorial configuration} tutorial.
 *
 * If the `opts` argument is omitted, Entree will try to find "data-model" document in the {@tutorial default-config-collection}.
 * By convention "data-model" is the default configuration file for Entree.
 * There may be additional configuration documents as described in the {@tutorial default-config-collection} tutorial.
 *
 * This method may be called multiple times; in which case all non-overlapping settings will be appended and overlapping ones will be merged.
 *
 * @func
 * @param {object=} opts - Object containing configuration information and additional options.
 * @param {function=} callback - An optional callback that will be called after the configuration is processed and all connections are initialized.
 */
Manager.prototype.configure = configure;

/**
 * Alias to [configure]{@link Manager#configure} method.
 *
 * @func
 */
Manager.prototype.init = configure;

/**
 * Creates a context object that is passed as the first argument in action methods
 * such as [insert]{@link Provider#insert}, [update]{@link Provider#update}, [select]{@link Provider#select} and etc.
 * This function just wraps the original context that is passed as an argument.
 * The wrapper is needed to properly distinguish the context from the rest of the arguments.
 *
 * Execution context is used to pass arguments to interceptors and shards. For instance,
 * authorization interceptor will require an `user` object in the context to determine the
 * rights of the caller for the current operation.
 *
 * @example
 *  var entree = require("entree");
 *
 *  app.post("/items", function (req, res) {
 *      var context = entree.createContext(req.user);
 *      entree.items.insert(context, req.body, function (err, result) {
 *          if (err) {
 *              res.statusCode = 500;
 *              return res.send(err.message);
 *          }
 *          res.send(JSON.stringify(result));
 *      });
 *  });
 *
 * @func
 * @param {object} context - The actual context.
 * @return {Context} - The context for the current execution;
 */
Manager.prototype.createContext = createContext;

module.exports = Manager;

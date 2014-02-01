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
        var conn = man.connections[el.connection];
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

function Manager(opts) {
    this.connections = {
        "fs-default": {
            provider: "file-system",
            options: {
                connStr: "./data"
            }
        }
    };
    this.schema = {};
    this.collections = [];
    this._opts = opts;
}

Manager.prototype.addConnection = function (name, provider, opts) {
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
};

Manager.prototype.removeConnection = function (name) {
    delete this.connections[name];
    return this;
};

Manager.prototype.addCollection = function (name, connection, interceptors, schema, done) {
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

    var that = this, argType, arg, cont, i;

    function setProvider() {
        var conn, schm, provider;

        if (!done) {
            done = function (err) {
                if (err) {
                    throw err;
                }
            };
        }

        if (!connection) {
            connection = Object.keys(that.connections)[0];
        }
        conn = that.connections[connection];
        if (!conn) {
            return done(new Err("NO_SUCH_CONN", [connection]));
        }
        if (schema) {
            if (typeof schema === "string") {
                schm = that.schema[schema];
                if (!schm) {
                    return done(new Err("NO_SUCH_SCHEMA", [schema]));
                }
            } else {
                if (!schema.name) {
                    return done(new Err("REQUIRED_NAME_PROP", ["schema"]));
                }
                if (that.schema[schema.name]) {
                    return done(new Err("SCHEMA_EXISTS", [schema.name]));
                }
                that.schema[schema.name] = schm = schema;
            }
        } else {
            schm = {};
        }

        if (!schm.__collName) {
            schm.__collName = name;
        }

        provider = new (that.resolveProvider(conn.provider))(conn.options, schm);

        if (interceptors) {
            interceptors.forEach(function (el) {
                if (typeof el !== "function") {
                    if (!el.disable) {
                        var interceptor = that.resolveInterceptor(el.interceptor);
                        el = interceptor.interception.apply(interceptor.interception, el.options);
                    }
                }
                provider.use(el);
            });
        }

        provider.name = name;
        that[name] = provider;
        that.collections.push(provider);

        provider.init(done);
    }

    if (arguments.length === 1) {
        return {
            setConnection: function (connName) {
                connection = connName;
                return this;
            },
            use: function (interceptor) {
                if (!interceptors) {
                    interceptors = [];
                }
                interceptors.push(interceptor);
                return this;
            },
            setSchema: function (schm) {
                schema = schm;
                return this;
            },
            done: function (callback) {
                done = callback;
                setProvider();
                return that;
            }
        };
    }

    for (i = 1; i < arguments.length; i++) {
        cont = false;
        arg = arguments[i];
        argType = typeof arg;
        switch (i) {
        case 1:
            switch (argType) {
            case "string":
                cont = true;
                break;
            case "object":
                if (Array.isArray(arg)) {
                    interceptors = arg;
                } else {
                    schema = arg;
                }
                break;
            case "function":
                done = arg;
                break;
            }

            if (!cont) {
                connection = null;
            }
            break;
        case 2:
            switch (argType) {
            case "object":
                if (Array.isArray(arg)) {
                    cont = true;
                } else {
                    schema = arg;
                }
                break;
            case "function":
                done = arg;
                break;
            }

            if (!cont) {
                interceptors = null;
            }
            break;
        case 3:
            switch (argType) {
            case "object":
                cont = true;
                break;
            case "function":
                done = arg;
                break;
            }

            if (!cont) {
                schema = null;
            }
            break;
        }
    }

    setProvider();
    return this;
};

Manager.prototype.removeCollection = function (name, done) {
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
};

Manager.prototype.addProvider = function (provider, name, done) {
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
};

Manager.prototype.dispose = function (done) {
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
};

Manager.prototype.resolveProvider = function (name) {
    switch (name) {
    case "file-system":
    case "mongodb":
    case "everlive":
        name = path.join(__dirname, "providers", name);
        break;
    }

    return require(name);
};

Manager.prototype.resolveInterceptor = function (name) {
    switch (name) {
    case "cache":
    case "log":
        name = path.join(__dirname, "interceptors", name);
        break;
    }

    return require(name);
};

Manager.prototype.configure = function (opts, callback) {

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
        if (opts.config.connection) {
            confConn = this.connections[opts.config.connection];
            if (!confConn) {
                callback(new Err("NO_SUCH_CONN", [opts.config.connection]));
            }
        } else {
            confConn = this.connections[0];
        }
    } else if (!this.config) {
        dataModelDoc = "data-model";
        confConn = this.connections[0];
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
};

Manager.prototype.init = Manager.prototype.configure;

/**
 * Creates a context object that is passed as the first argument in action methods such as insert, update, select and etc.
 * This function just wraps the original context that is passed as an argument. The wrapper is needed to properly distinguish the context from the rest of the arguments.
 *
 * Execution context is used to pass arguments to interceptors and shards. For instance, authorization interceptor will require an `user` object in the context to determine the rights of the caller for the current operation.
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
 *
 * @param {object} context - The actual context.
 * @return {Context} - The context for the current execution;
 */
Manager.prototype.createContext = function (context) {
    return new Context(context);
};

module.exports = Manager;

/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    Context     = require("./context"),
    Err         = require("./error"),
    _           = require("lodash"),
    async       = require("async"),
    util        = require("util"),
    path        = require("path");

function initProviders(man, model, done) {
    var provs;

    if (model.environments && model.environments[man.env]) {
        provs = model.environments[man.env].providers;
    }

    if (!provs) {
        if (model.providers) {
            provs = model.providers;
        } else {
            return done(new Err("NO_PROVIDERS", [man.env]));
        }
    }

    function addInterceptors(provider, interceptors) {
        if (interceptors) {
            _.each(interceptors, function (interConf) {
                if (!interConf.disable) {
                    var interceptor = man.resolveInterceptor(interConf.interceptor);
                    provider.use(interceptor.interception.apply(interceptor.interception, interConf.arguments));
                }
            });
        }
    }

    function iterator1(conf, done1) {
        if (conf.disable) {
            return done1();
        }

        var Provider = man.resolveProvider(conf.provider);

        function iterator2(coll, done2) {
            var schema, prov;
            if (coll.schema && model.schema && model.schema[coll.schma]) {
                schema = model.schema[coll.schma];
                schema.__collName = coll.name;
            } else {
                schema = { __collName: coll.name };
            }
            prov = new Provider(conf.options, schema);
            addInterceptors(prov, conf.interceptors);
            addInterceptors(prov, coll.interceptors);
            man.addProvider(prov, coll.name, done2);
        }

        async.each(conf.collections, iterator2, done1);
    }

    async.each(provs, iterator1, done);
}

function Manager(opts) {
    this.providers = [];
    this._opts = opts;
}

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
            that.providers.push(provider);
        } else if (!done) {
            throw err;
        }
        if (done) {
            done(err);
        }
    });
};

Manager.prototype.removeProvider = function (name, done) {
    if (!this[name]) {
        var err = new Err("NO_SUCH_PROVIDER", [name]);
        if (done) {
            return done(err);
        }
        throw err;
    }
    delete this[name];
    var provs = _.remove(this.providers, function (item) {
        return item.name === name;
    });

    provs[0].dispose(done || function (err) {
        if (err) {
            throw err;
        }
    });
};

Manager.prototype.dispose = function (done) {
    var that = this;

    function iterator(prov, done) {
        delete that[prov.name];
        prov.dispose(done);
    }

    async.each(_.values(that.providers), iterator, function (err) {
        if (!err) {
            that.providers.length = 0;
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
        confProv;

    this.env = opts.env || process.env.NODE_ENV || "development";

    function getConfProvider(provider, opts, schema) {
        return new (that.resolveProvider(provider || "file-system"))(opts || { connStr: path.join(process.cwd(), "data") }, schema || { __collName: "config" });
    }

    if (opts.config) {
        dataModelDoc = opts.config.modelDocument;
        if (!dataModelDoc) {
            return callback(new Err("MISSING_CONF_PARAMS"));
        }
        confProv = getConfProvider(opts.config.provider, opts.config.options, opts.config.schema);
    } else if (!this.config) {
        dataModelDoc = "dataModel";
        confProv = getConfProvider();
    }

    async.series([
        function (done) {
            if (!confProv) {
                return done();
            }

            if (that.config) {
                that.removeProvider("config", function (err) {
                    if (err) {
                        return done(err);
                    }
                    that.addProvider(confProv, "config", done);
                });
            } else {
                that.addProvider(confProv, "config", done);
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

                initProviders(that, model, done);
            });
        },
        function (done) {
            if (!opts.model) {
                return done();
            }

            initProviders(that, opts.model, done);
        }
    ], callback);
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

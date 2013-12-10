/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    _           = require("lodash"),
    async       = require("async"),
    util        = require("util"),
    path        = require("path");

function Manager(opts) {
    if (!opts) {
        opts = {};
    }
    this.providers = [];
    this.dataModelDoc = "dataModel";
    this.env = opts.env || process.env.NODE_ENV || "development";
    if (_.isFunction(opts.config)) {
        this.config = opts.config;
        return;
    }

    var confArgs    = [""],
        confName;

    if (opts.config) {
        if (opts.config.modelDocument) {
            this.dataModelDoc = opts.config.modelDocument;
        }

        if (opts.config.provider) {
            confName = opts.config.provider;
            confArgs.push(opts.config.options);
            confArgs.push(opts.config.schema);
        }
    }

    if (!confName) {
        confName = "file-system";
        confArgs.push({
            connStr: path.join(process.cwd(), "data")
        });
        confArgs.push({
            __collName: "config"
        });
    }

    if (opts.model) {
        this.model = opts.model;
    }

    var ConfProv = this.resolveProvider(confName);
    this.config = new (Function.prototype.bind.apply(ConfProv, confArgs))();
    this.providers.push(this.config);
}

Manager.prototype.addProvider = function (provider, name, done) {
    var that = this;
    if (this[name]) {
        var err = new Error(util.format(Strings.PROVIDER_EXISTS, name));
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
        var err = new Error(util.format(Strings.NO_SUCH_PROVIDER, name));
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
        name = "./providers/" + name;
        break;
    }

    return require(name);
};

Manager.prototype.resolveInterceptor = function (name) {
    switch (name) {
    case "cache":
    case "log":
        name = "./interceptors/" + name;
        break;
    }

    return require(name);
};

Manager.prototype.init = function (callback) {
    var that = this;

    function initProviders() {
        var provs;

        if (that.model.environments && that.model.environments[that.env]) {
            provs = that.model.environments[that.env].providers;
        }

        if (!provs) {
            if (that.model.providers) {
                provs = that.model.providers;
            } else {
                return callback(new Error(util.format(Strings.NO_PROVIDERS, that.env)));
            }
        }

        function addInterceptors(provider, interceptors) {
            if (interceptors) {
                _.each(interceptors, function (interConf) {
                    if (!interConf.disable) {
                        var interceptor = that.resolveInterceptor(interConf.interceptor);
                        provider.use(interceptor.interception.apply(interceptor.interception, interConf.arguments));
                    }
                });
            }
        }

        function iterator1(conf, done1) {
            if (conf.disable) {
                return done1();
            }

            var Provider = that.resolveProvider(conf.provider);

            function iterator2(coll, done2) {
                var schema, prov;
                if (coll.schema && that.model.schema && that.model.schema[coll.schma]) {
                    schema = that.model.schema[coll.schma];
                    schema.__collName = coll.name;
                } else {
                    schema = { __collName: coll.name };
                }
                prov = new Provider(conf.options, schema);
                addInterceptors(prov, conf.interceptors);
                addInterceptors(prov, coll.interceptors);
                that.addProvider(prov, coll.name, done2);
            }

            async.each(conf.collections, iterator2, done1);
        }

        async.each(provs, iterator1, callback);
    }

    that.config.init(function (err) {
        if (err) {
            return callback(err);
        }

        if (that.model) {
            initProviders();
        } else {
            that.config.get(null, that.dataModelDoc, function (err, model) {
                if (err) {
                    return callback(err);
                }

                that.model = model;
                initProviders();
            });
        }
    });
};

module.exports = Manager;

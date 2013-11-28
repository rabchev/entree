/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

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
        confName = "./providers/file-system";
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

    var ConfProv = require(confName);
    this.config = new (Function.prototype.bind.apply(ConfProv, confArgs))();
    this.providers.push(this.config);
}

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

        function iterator1(conf, done1) {
            switch (conf.provider) {
            case "file-system":
            case "mongodb":
            case "everlive":
                conf.provider = "./providers/" + conf.provider;
                break;
            }

            var Provider = require(conf.provider);

            function iterator2(coll, done2) {
                var schema, prov;
                if (coll.schema && that.model.schema && that.model.schema[coll.schma]) {
                    schema = that.model.schema[coll.schma];
                    schema.__collName = coll.name;
                } else {
                    schema = { __collName: coll.name };
                }
                prov = new Provider(conf.options, schema);
                prov.init(function (err) {
                    if (!err) {
                        that[coll.name] = prov;
                        that.providers.push(prov);
                    }
                    done2(err);
                });
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

Manager.prototype.dispose = function (callback) {

    function iterator(prov, done) {
        prov.dispose(done);
    }

    async.each(_.values(this.providers), iterator, callback);
};

module.exports = Manager;

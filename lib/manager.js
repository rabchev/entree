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
    } else {
        var confArgs    = [""],
            confName;

        if (!opts.config) {
            confName = "./providers/file-system";
            confArgs.push(path.join(process.cwd(), "data"));
            confArgs.push({
                name: "config"
            });
        } else {
            confName = opts.config.provider;
            if (!_.isString(confName)) {
                throw new Error(Strings.MISSING_CONF_PROV);
            }
            if (opts.config.dataModel) {
                if (typeof opts.config.dataModel === "string") {
                    this.dataModelDoc = opts.config.dataModel;
                } else {
                    this.model = opts.config.dataModel;
                    this.dataModelDoc = null;
                }
            }
            if (opts.config.connStr) {
                confArgs.push(opts.config.connStr);
            }
            if (opts.config.opts) {
                confArgs.push(opts.config.opts);
            }
        }

        var ConfProv = require(confName);
        this.config = new (Function.prototype.bind.apply(ConfProv, confArgs))();
        this.providers.push(this.config);
    }
}

Manager.prototype.init = function (callback) {
    var that = this;

    function initProviders() {
        if (!that.model.environments && !that.model.environments[that.env]) {
            return callback(new Error(util.format(Strings.MISSING_CONF_FOR_ENV, that.env)));
        }

        var provs = that.model.environments[that.env].providers;
        if (!provs) {
            return callback(new Error(util.format(Strings.NO_PROVIDERS, that.env)));
        }

        function iterator1(conf, done1) {
            var Provider = require(conf.provider);

            function iterator2(coll, done2) {
                var prov = new Provider(conf.connStr, coll);
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

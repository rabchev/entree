/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    url         = require("url"),
    util        = require("util"),
    https       = require("https"),
    _           = require("lodash");

// *** Cursor Implementation ***

function EverliveCursor(provider, query, options) {
    Cursor.call(this, provider, query, options);
}

util.inherits(EverliveCursor, Cursor);

EverliveCursor.prototype.reset = function () {

};

EverliveCursor.prototype._exec = function (callback) {
    var that        = this,
        opts        = _.cloneDeep(that.provider._reqOpts),
        req;

    opts.method = "GET";

    req = https.request(opts, function (res) {
        that.provider._handleResponse(res, function (err, data) {
            if (!err) {
                that.items = data;
            }
            callback(err);
        });
    });

    req.on('error', function (err) {
        that.provider.handleError(err, callback);
    });

    req.end();
};

// *** Provider Implementation ***

function EverliveProvider(connStr, options) {
    var path = connStr;

    if (!connStr || !_.isString(connStr)) {
        throw new Error("Missing connStr (connection string) argument.");
    }

    if (options) {
        if (options.typeName) {
            path = url.resolve(path, options.typeName);
        }
        this._reqOpts = url.parse(path);
        this._reqOpts.headers = { "Content-Type": "application/json" };

        if (options.authorization) {
            this._reqOpts.headers.Authorization = options.authorization;
        }
    }

    Provider.call(this, connStr, options);
}

util.inherits(EverliveProvider, Provider);

EverliveProvider.prototype._handleResponse = function (res, callback) {
    var that = this;

    res.setEncoding("utf8");
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
        if (res.headers["content-length"]) {
            res.on('data', function (data) {
                callback(null, JSON.parse(data));
            });
        } else {
            callback();
        }
    } else {
        if (res.headers["content-length"]) {
            res.on("data", function (data) {
                that.handleError(data, callback);
            });
        } else {
            that.handleError("Request failed with status code: " + res.statusCode, callback);
        }
    }
};

EverliveProvider.prototype._insert = function (item, callback) {
    var that        = this,
        idKey       = this._getIdKey(),
        opts        = _.cloneDeep(this._reqOpts),
        payload,
        req,
        id;

    if (idKey !== "Id" && (id = this._getId(item))) {
        item.Id = id;
    }
    payload = JSON.stringify(item);

    opts.method = "POST";
    opts.headers["Content-Length"] = payload.length;

    req = https.request(opts, function (res) {
        that._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err, data);
            }

            if (idKey !== "Id" && data.Result.Id) {
                that._setId(item, data.Result.Id);
            }
            callback(err, item);
        });
    });

    req.on("error", function (err) {
        that.handleError(err, callback);
    });

    req.write(payload);
    req.end();
};

EverliveProvider.prototype._update = function (item, callback) {
    var that    = this,
        idKey   = this._getIdKey(),
        id      = this._getId(item),
        opts    = _.cloneDeep(this._reqOpts),
        payload,
        req;

    if (!id) {
        return this.handleError(Strings.MISSING_ID, callback);
    }

    if (idKey !== "Id") {
        item.Id = id;
    }
    payload = JSON.stringify(item);

    opts.method = "PUT";
    opts.headers["Content-Length"] = payload.length;
    opts.path += "/" + id;

    req = https.request(opts, function (res) {
        that._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err, data);
            }
            _.extend(item, data.Result);
            callback(err, item);
        });
    });

    req.on("error", function (err) {
        that.handleError(err, callback);
    });

    req.write(payload);
    req.end();
};

EverliveProvider.prototype._upsert = function (item, callback) {
    var that = this;

    this._get(item, function (err, data) {
        if (data) {
            that._update(item, callback);
        } else {
            that._insert(item, callback);
        }
    });
};

EverliveProvider.prototype._delete = function (item, callback) {
    var that    = this,
        id      = that._getId(item),
        opts    = _.cloneDeep(this._reqOpts),
        req;

    if (!id) {
        return this.handleError(Strings.MISSING_ID, callback);
    }

    opts.method = "DELETE";
    opts.path += "/" + id;

    req = https.request(opts, function (res) {
        that._handleResponse(res, callback);
    });

    req.on("error", function (err) {
        that.handleError(err, callback);
    });

    req.end();
};

EverliveProvider.prototype._get = function (item, callback) {
    var that        = this,
        opts        = _.cloneDeep(this._reqOpts),
        id          = that._getId(item),
        req;

    if (!id) {
        return that.handleError(Strings.MISSING_ID, callback);
    }

    opts.method = "GET";
    opts.path += "/" + id;

    req = https.request(opts, function (res) {
        that._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err, data);
            }

            if (that._getIdKey() !== "Id" && data.Result.Id) {
                that._setId(data.Result, data.Result.Id);
            }
            callback(err, data.Result);
        });
    });

    req.on('error', function (err) {
        that.handleError(err, callback);
    });

    req.end();
};

EverliveProvider.prototype._select = function (args, callback) {
    var cursor = new EverliveCursor(this, args.query, args.options);
    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = EverliveProvider;

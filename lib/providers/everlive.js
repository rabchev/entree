/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    url         = require("url"),
    util        = require("util"),
    https       = require("https"),
    _           = require("lodash");

function EverliveCursor(provider, query, options) {

    Cursor.call(this, provider, query, options);
}

util.inherits(EverliveCursor, Cursor);

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
        if (res.headers["Content-Length"]) {
            res.on('data', function (data) {
                callback(null, JSON.parse(data));
            });
        } else {
            callback();
        }
    } else {
        if (res.headers["Content-Length"]) {
            res.on("data", function (data) {
                that.handleError(data, callback);
            });
        } else {
            that.handleError("Request failed with status code: " + res.statusCode, callback);
        }
    }
};

EverliveProvider.prototype._insert = function (item, callback) {
    var payload = JSON.stringify(item),
        opts    = _.cloneDeep(this._reqOpts),
        that    = this,
        req;

    opts.method = "POST";
    opts.headers["Content-Length"] = payload.length;

    req = https.request(opts, function (res) {
        that._handleResponse(res, callback);
    });

    req.on("error", function (err) {
        that.handleError(err, callback);
    });

    req.write(payload);
    req.end();
};

EverliveProvider.prototype._update = function (item, callback) {
    var that    = this,
        id      = this._getId(item),
        opts    = _.cloneDeep(this._reqOpts),
        payload = JSON.stringify(item),
        req;

    if (!id) {
        return this.handleError(Strings.MISSING_ID, callback);
    }

    opts.method = "PUT";
    opts.headers["Content-Length"] = payload.length;
    opts.path += "/" + id;

    req = https.request(opts, function (res) {
        that._handleResponse(res, callback);
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
        that._handleResponse(res, callback);
    });

    req.on('error', function (err) {
        that.handleError(err, callback);
    });

    req.end();
};

module.exports = EverliveProvider;

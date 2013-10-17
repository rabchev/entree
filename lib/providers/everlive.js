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
    if (!connStr || !_.isString(connStr)) {
        throw new Error("Missing connStr (connection string) argument.");
    }

    if (options) {
        if (options.typeName) {
            connStr = url.resolve(connStr, options.typeName);
        }
        this._reqOpts = url.parse(connStr);
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
    if (res.statusCode === 200) {
        if (res.headers["Content-Length"]) {
            res.on('data', function(data) {
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

    req = https.request(opts, function(res) {
        that._handleResponse(res, callback);
    });

    req.on("error", function(err) {
        that.handleError(err, callback);
    });

    req.write(payload);
    req.end();
};

EverliveProvider.prototype._update = function (item, callback) {
    var that = this;

//    that._get(item, function (err, res) {
//        if (err) {
//            return that.handleError(err, callback);
//        }
//
//        var mrg         = that.merge(item, res),
//            id          = that._getId(mrg),
//            filePath    = path.join(that.dir, id + ".json");
//
//        fs.writeFile(filePath, JSON.stringify(mrg), function (err) {
//            if (err) {
//                that.handleError(err, callback);
//            } else {
//                callback(null, mrg);
//            }
//        });
//    });
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

    req = https.request(opts, function(res) {
        that._handleResponse(res, callback);
    });

    req.on('error', function(err) {
        that.handleError(err, callback);
    });

    req.end();
};

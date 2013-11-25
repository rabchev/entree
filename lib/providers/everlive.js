/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    url         = require("url"),
    util        = require("util"),
    _           = require("lodash");

// *** Cursor Implementation ***

function EverliveCursor(provider, query, options) {
    this._result = null;
    this._shouldSetId = provider._getIdKey() !== "Id";
    this.current = 0;

    Cursor.call(this, provider, query, options);
}

util.inherits(EverliveCursor, Cursor);

EverliveCursor.prototype.reset = function () {
    this.current = 0;
    if (this.mapping && _.isFunction(this.mapping)) {
        this._mapFunc = true;
    }

    return this;
};

EverliveCursor.prototype._map = function (item) {
    if (item && this._mapFunc) {
        return this.mapping(item);
    }
    return item;
};

EverliveCursor.prototype._nextObject = function (callback) {
    if (!this._result) {
        return this.provider.handleError(
            new Error("Inconsistent cursor state."),
            callback
        );
    }

    var item = this._result[this.current++];
    if (this._shouldSetId && item && item.Id) {
        this.provider._setId(item, item.Id);
    }
    callback(null, this._map(item));
};

EverliveCursor.prototype.count = function (callback) {
    if (this._result) {
        return callback(null, this._result.length);
    }

    var that        = this,
        opts        = _.cloneDeep(that.provider._reqOpts),
        req;

    opts.method = "GET";
    opts.path += "/_count";
    if (that.query) {
        opts.headers["X-Everlive-Filter"] = JSON.stringify(that.query);
    }

    req = that.provider.http.request(opts, function (res) {
        that.provider._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err);
            }

            callback(null, data.Result);
        });
    });

    req.on('error', function (err) {
        that.provider.handleError(err, callback);
    });

    req.end();
};

EverliveCursor.prototype.update = function (data, callback) {
    this._exec(callback, "PUT", data);

    return this;
};

EverliveCursor.prototype.delete = function (callback) {
    this._exec(callback, "DELETE");

    return this;
};

EverliveCursor.prototype._exec = function (callback, method, data) {
    var that        = this,
        opts        = _.cloneDeep(that.provider._reqOpts),
        fields,
        payload,
        req;

    opts.method = method || "GET";
    if (that.query) {
        opts.headers["X-Everlive-Filter"] = JSON.stringify(that.query);
    }
    if (that.skipValue) {
        opts.headers["X-Everlive-Skip"] = that.skipValue;
    }
    if (that.limitValue) {
        opts.headers["X-Everlive-Take"] = that.limitValue;
    }
    if (that.mapping && !_.isFunction(that.mapping)) {
        if (_.isArray(that.mapping)) {
            fields = {};
            _.each(that.mapping, function (itm) {
                fields[itm] = 1;
            });
        } else {
            fields = that.mapping;
        }
        opts.headers["X-Everlive-Fields"] = JSON.stringify(fields);
    }
    if (that.criteria) {
        if (_.isFunction(that.criteria)) {
            return callback(new Error("Everlive provider does not support custom comparers."));
        }
        opts.headers["X-Everlive-Sort"] = JSON.stringify(that.criteria);
    }

    req = that.provider.http.request(opts, function (res) {
        that.provider._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err);
            }

            if (method) {
                return callback(null, data.Result);
            }

            that._result = data.Result;
            callback();
        });
    });

    req.on('error', function (err) {
        that.provider.handleError(err, callback);
    });

    if (data) {
        payload = JSON.stringify(data);
        opts.headers["Content-Length"] = payload.length;
        req.write(payload);
    }
    req.end();
};

// *** Provider Implementation ***

function EverliveProvider(connStr, options) {
    var path = connStr;

    if (!connStr || !_.isString(connStr)) {
        throw new Error(Strings.MISSING_CONN_STR);
    }

    if (options) {
        if (options.name) {
            path = url.resolve(path, options.name);
        }
        this._reqOpts = url.parse(path);
        this._reqOpts.headers = { "Content-Type": "application/json" };

        if (options.authorization) {
            this._reqOpts.headers.Authorization = options.authorization;
        }
    }

    if (this._reqOpts.protocol === "https:") {
        this.http = require("https");
    } else {
        this.http = require("http");
    }

    Provider.call(this, connStr, options);
}

util.inherits(EverliveProvider, Provider);

EverliveProvider.prototype._handleResponse = function (res, callback) {
    var that    = this,
        result  = "";

    res.setEncoding("utf8");
    res.on("data", function (data) {
        result += data;
    });

    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
        if (res.headers["content-length"]) {
            res.on("end", function () {
                callback(null, JSON.parse(result));
            });
        } else {
            callback();
        }
    } else {
        if (res.headers["content-length"]) {
            res.on("end", function () {
                that.handleError(result, callback);
            });
        } else {
            that.handleError("Request failed with status code: " + res.statusCode, callback);
        }
    }
};

EverliveProvider.prototype._setIds = function (items, source) {
    var that = this,
        idKey = that._getIdKey(),
        i;

    function setEvId(item) {
        var id;

        if ((id = that._getId(item)) !== undefined) {
            item.Id = id;
        }
    }

    if (idKey !== "Id") {
        if (_.isArray(items)) {
            for (i = 0; i < items.length; i++) {
                if (source) {
                    that._setId(items[i], source[i].Id);
                } else {
                    setEvId(items[i]);
                }
            }
        } else {
            if (source) {
                that._setId(items, source.Id);
            } else {
                setEvId(items);
            }
        }
    }
};

EverliveProvider.prototype._insert = function (items, callback) {
    var that        = this,
        opts        = _.cloneDeep(this._reqOpts),
        payload,
        req;

    that._setIds(items);

    payload = JSON.stringify(items);

    opts.method = "POST";
    opts.headers["Content-Length"] = payload.length;

    req = this.http.request(opts, function (res) {
        that._handleResponse(res, function (err, data) {
            if (err) {
                return callback(err, data);
            }

            that._setIds(items, data.Result);
            callback(err, items);
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

    req = this.http.request(opts, function (res) {
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

    req = this.http.request(opts, function (res) {
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

    req = this.http.request(opts, function (res) {
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

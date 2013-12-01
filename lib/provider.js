/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    _           = require("lodash"),
    util        = require("util");

function Context(obj) {
    if (obj) {
        this.__orgObj = obj;
    } else if (obj === null) {
        this.__isEmpty = true;
    }
}

function validateArgs(args, name) {
    var res = {};
    if (args.length === 2) {
        res.item = args[0];
        res.callback = args[1];
    } else if (args.length > 2) {
        res.item = args[1];
        res.callback = args[2];
        res.context = args[0];
    }

    if (!res.item) {
        if (res.callback) {
            res.callback(new Error(util.format(Strings.MISSING_ARG, name)));
        } else {
            throw new Error(Strings.REQUIRED_CALLBACK);
        }
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

function validateSelectArgs(args) {
    var res = {};

    switch (args.length) {
    case 4:
        res.context = args[0];
        res.query = args[1];
        res.options = args[2];
        res.callback = args[3];
        break;
    case 3:
        if (args[0] instanceof Context) {
            res.context = args[0];
            res.query = args[1];
            if (_.isFunction(args[2])) {
                res.callback = args[2];
            } else {
                res.options = args[2];
            }
        } else {
            res.query = args[0];
            res.options = args[1];
            res.callback = args[2];
        }
        break;
    case 2:
        if (args[0] instanceof Context) {
            res.context = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.query = args[1];
            }
        } else {
            res.query = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.options = args[1];
            }
        }
        break;
    case 1:
        if (args[0] instanceof Context) {
            res.context = args[0];
        } else {
            res.query = args[0];
        }
        break;
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

function Provider(options, schema) {

    if (!options || !options.connStr || !_.isString(options.connStr) || !schema || !schema.__collName || !_.isString(schema.__collName)) {
        throw new Error(Strings.MISSING_PROV_ARGS);
    }

    this.options            = options;
    this.schema             = schema;
    this._stack             = [];
}

Provider.prototype.createContext = function (context) {
    return new Context(context);
};

Provider.prototype.insert = function () {
    var args = validateArgs(arguments, "items");
    if (args) {
        this._do("_insert", args.context, args.item, args.callback);
    }
};

Provider.prototype.upsert = function () {
    var args = validateArgs(arguments, "item");
    if (args) {
        this._do("_upsert", args.context, args.item, args.callback);
    }
};

Provider.prototype.update = function () {
    var args = validateArgs(arguments, "item");
    if (args) {
        this._do("_update", args.context, args.item, args.callback);
    }
};

Provider.prototype.delete = function () {
    var args = validateArgs(arguments, "itemOrID");
    if (args) {
        this._do("_delete", args.context, args.item, args.callback);
    }
};

Provider.prototype.get = function () {
    var args = validateArgs(arguments, "itemOrID");
    if (args) {
        this._do("_get", args.context, args.item, args.callback);
    }
};

Provider.prototype.select = function () {
    var args = validateSelectArgs(arguments);
    if (args) {
        return this._do("_select", args.context, { query: args.query, options: args.options }, args.callback);
    }
};

Provider.prototype.selectOne = function (context, query, options, callback) {
    if (!callback) {
        if (options) {
            callback = options;
            options = null;
        } else if (query) {
            callback = query;
            query = null;
        } else if (context) {
            callback = context;
            context = null;
        }
    }
    if (!_.isFunction(callback)) {
        throw new Error(Strings.REQUIRED_CALLBACK);
    }
    this.select(context, query, options).first(callback);
};

Provider.prototype.use = function (fn) {
    fn.provider = this;
    this._stack.push(fn);
};

Provider.prototype._getId = function (item) {
    if (typeof item === "object" && !(item instanceof Array)) {
        return item[this._getIdKey()];
    } else {
        return item;
    }
};

Provider.prototype._setId = function (item, id) {
    if (typeof item === "object" && !(item instanceof Array)) {
        item[this._getIdKey()] = id;
    }
};

Provider.prototype._getIdKey = function () {
    return this.schema.identifier || "_id";
};

Provider.prototype._do = function (action, context, item, callback) {
    var idx = 0,
        that = this;

    function next(itm, out) {
        var layer = that._stack[idx++];
        if (layer) {
            return layer(action, context, itm, next, out);
        }

        return that[action](itm, out);
    }

    return next(item, callback);
};

Provider.prototype.merge = function (src, trg) {
    if (src !== trg) {
        return _.defaults(src, trg);
    }
    return src;
};

Provider.prototype.init = function (callback) {
    // Override if you need to initialize database connection.
    callback();
};

Provider.prototype.dispose = function (callback) {
    // Override if you need to dispose database connection.
    callback();
};

Provider.prototype.handleError = function (err, callback) {
    if (typeof err === "string") {
        err = new Error(err);
    }

    if (callback) {
        callback(err);
    } else {
        throw err;
    }
};

Provider.prototype._insert = function (items, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._upsert = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._update = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._delete = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._get = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._select = function (args, callback) {
    // abstract
    throw new Error(Strings.NOT_IMPLEMENTED);
};

module.exports = Provider;

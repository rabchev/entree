/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

"use strict";

var Strings     = require("./strings"),
    _           = require("underscore"),
    util        = require("util");

function validateArg(arg, name, callback) {
    if (!arg) {
        var err = new Error(util.format(Strings.MISSING_ARG, name));
        if (callback) {
            callback(err);
        } else {
            throw err;
        }
    }
}

function Provider(connStr, options) {
    this.connectionString   = connStr;
    this.options            = options || {};
    this._stack             = [];
}

Provider.prototype.insert = function (context, item, callback) {
    validateArg(item, "item", callback);
        
    this._do("_insert", context, item, callback);
};

Provider.prototype.upsert = function (context, item, callback) {
    validateArg(item, "item", callback);
    
    this._do("_upsert", context, item, callback);
};

Provider.prototype.update = function (context, item, callback) {
    validateArg(item, "item", callback);
    
    this._do("_update", context, item, callback);
};

Provider.prototype.delete = function (context, itemOrID, callback) {
    validateArg(itemOrID, "itemOrID", callback);
    
    this._do("_delete", context, itemOrID, callback);
};

Provider.prototype.get = function (context, itemOrID, callback) {
    validateArg(itemOrID, "itemOrID", callback);
    
    this._do("_get", context, itemOrID, callback);
};

Provider.prototype.select = function (context, query, options, callback) {
    if (!callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        } else if (typeof query === "function") {
            callback = query;
            query = null;
        }
    }
    
    var args = {
        query: query,
        options: options
    };
    
    return this._do("_select", context, args, callback);
};

Provider.prototype.use = function (fn) {
    this._stack.push(fn);
};

Provider.prototype._getId = function (item) {
    if (typeof item === "object" && !(item instanceof Array)) {
        return item[this.options.identifier || "_id"];
    } else {
        return item;
    }
};

Provider.prototype._setId = function (item, id) {
    if (typeof item === "object" && !(item instanceof Array)) {
        item[this.options.identifier || "_id"] = id;
    }
};

Provider.prototype._do = function (action, context, item, callback) {
    var idx = 0,
        me = this;
        
    function next(itm, out) {
        var layer = me._stack[idx++];
        if (layer) {
            return layer(action, context, itm, next, out);
        }
        
        return me[action](itm, out);
    }
    
    return next(item, callback);
};

Provider.prototype.merge = function (src, trg) {
    if (src !== trg) {
        return _.defaults(src, trg);
    }
    return src;
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

Provider.prototype._insert = function (item, callback) {
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
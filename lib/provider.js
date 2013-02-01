/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var Strings     = require("./strings"),
    util        = require("util");

function validateArg(arg, name, callback) {
    "use strict";
    
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
    "use strict";
    
    this.connectionString   = connStr;
    this.options            = options || {};
    this.stack             = [];
}

Provider.prototype.insert = function (context, item, callback) {
    "use strict";
    
    validateArg(item, "item", callback);
        
    this._do("_insert", context, item, callback);
};

Provider.prototype.upsert = function (context, item, callback) {
    "use strict";
    
    validateArg(item, "item", callback);
    
    this._do("_upsert", context, item, callback);
};

Provider.prototype.update = function (context, item, callback) {
    "use strict";
    
    validateArg(item, "item", callback);
    
    this._do("_update", context, item, callback);
};

Provider.prototype.delete = function (context, itemOrID, callback) {
    "use strict";
    
    validateArg(itemOrID, "itemOrID", callback);
    
    this._do("_delete", context, itemOrID, callback);
};

Provider.prototype.get = function (context, itemOrID, callback) {
    "use strict";
    
    validateArg(itemOrID, "itemOrID", callback);
    
    this._do("_get", context, itemOrID, callback);
};

Provider.prototype.select = function (context, query, projection, options, callback) {
    "use strict";
    
    if (!callback) {
        if (typeof options === "function") {
            callback = options;
            options = null;
        } else if (typeof projection === "function") {
            callback = projection;
            projection = null;
        }
    }
    
    validateArg(query, "query", callback);
    
    var args = {
        query: query,
        projection: projection,
        options: options
    };
    
    return this._do("_select", context, args, callback);
};

Provider.prototype.use = function (fn) {
    "use strict";
    
    this._stack.push(fn);
};

Provider.prototype._getId = function (item) {
    "use strict";
    
    if (typeof item === "object" && !(item instanceof Array)) {
        var id = this.options.identifier;
        return id ? item[id] : null;
    } else {
        return item;
    }
};

Provider.prototype._do = function (action, context, item, callback) {
    "use strict";
    
    var idx = 0,
        me = this;
        
    function next(itm, out) {
        var layer = me.stack[idx++];
        if (layer) {
            return layer(action, context, itm, next, out);
        }
        
        return me[action](itm, out);
    }
    
    return next(item, callback);
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

module.exports = exports = Provider;
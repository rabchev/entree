/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

function Provider(connStr, options) {
    "use strict";
    
    this.connectionString   = connStr;
    this.options            = options || {};
    this.stack             = [];
}

Provider.prototype.insert = function (context, data, callback) {
    "use strict";
    
    this._do("_insert", context, data, callback);
};

Provider.prototype.upsert = function (context, data, callback) {
    "use strict";
    
    this._do("_upsert", context, data, callback);
};

Provider.prototype.update = function (context, data, callback) {
    "use strict";
    
    this._do("_update", context, data, callback);
};

Provider.prototype.delete = function (context, data, callback) {
    "use strict";
    
    this._do("_delete", context, data, callback);
};

Provider.prototype.get = function (context, data, callback) {
    "use strict";
    
    this._do("_get", context, data, callback);
};

Provider.prototype.select = function (context, query, callback) {
    "use strict";
    
    this._do("_select", context, query, callback);
};

Provider.prototype.use = function (fn) {
    "use strict";
    
    this._stack.push(fn);
};

Provider.prototype._do = function (action, context, data, callback) {
    "use strict";
    
    var idx = 0,
        me = this;
    
    function exit(err, result) {
        callback(err, result);
    }
    
    function next(dta, out) {
        var layer = me.stack[idx++];
        if (layer) {
            layer(action, context, dta, next, out);
        } else {
            me[action](dta, out);
        }
    }
    
    next(data, exit);
};

Provider.prototype._insert = function (data, callback) {
    // abstract
};

Provider.prototype._upsert = function (data, callback) {
    // abstract
};

Provider.prototype._update = function (data, callback) {
    // abstract
};

Provider.prototype._delete = function (data, callback) {
    // abstract
};

Provider.prototype._get = function (data, callback) {
    // abstract
};

Provider.prototype._select = function (query, callback) {
    // abstract
};

module.exports = exports = Provider;
/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

function Provider(connStr, options) {
    "use strict";
    
    this.connectionString   = connStr;
    this.options            = options || {};
    this.statck             = [];
}

Provider.prototype.insert = function (context, data, callback) {
    "use strict";
    
};

Provider.prototype.upsert = function (context, data, callback) {
    "use strict";
    
};

Provider.prototype.update = function (context, data, callback) {
    "use strict";
    
};

Provider.prototype.delete = function (context, data, callback) {
    "use strict";
    
};

Provider.prototype.get = function (context, data, callback) {
    "use strict";
    
};

Provider.prototype.select = function () {
    "use strict";
    
};

Provider.prototype.use = function (fn) {
    "use strict";
    
    this._stack.push(fn);
};

Provider.prototype._do = function (action, context, data, callback) {
    "use strict";
    
    var idx = 0;
    
    function exit(err, result) {
        callback(err, result);
    }
    
    function next(dta, out) {
        var layer = this.stack[idx++];
        if (layer) {
            layer(action, context, dta, next, out);
        } else {
            this[action](dta, out);
        }
    }
    
    next(data, exit);
};

Provider.prototype._insert = function (data, callback) {
    // abstract
};

Provider.prototype._upsert = function (data, callback) {l
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

Provider.prototype._select = function () {
    // abstract
};

module.exports = exports = Provider;
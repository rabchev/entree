/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var Provider    = require("../../lib/provider"),
    util        = require("util");

function PostProvider(connStr, options) {
    Provider.call(this, connStr, options);
    this.store = [];
}

PostProvider.prototype._insert = function (item, callback) {
    "use strict";
    
    process.nextTick(function () {
        if (this.store[item._id]) {
            callback(new Error("Item exists."));
        } else {
            this.store[item._id] = item;
            callback(null, item);
        }
    });
};

PostProvider.prototype._upsert = function (item, callback) {
    "use strict";
    
    process.nextTick(function () {
        this.store[item._id] = item;
        callback(null, item);
    });
};

PostProvider.prototype._update = function (item, callback) {
    "use strict";
    
    process.nextTick(function () {
        if (!this.store[item._id]) {
            callback(new Error("Item doesn't exists."));
        } else {
            this.store[item._id] = item;
            callback(null, item);
        }
    });
};

PostProvider.prototype._delete = function (item, callback) {
    "use strict";
    
    process.nextTick(function () {
        if (!this.store[item._id]) {
            callback(new Error("Item doesn't exists."));
        } else {
            delete this.store[item._id];
            callback(null, item);
        }
    });
};

util.inherits(PostProvider, Provider);

module.exports = exports = PostProvider;
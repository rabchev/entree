/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var Provider    = require("../../lib/provider"),
    Cursor      = require("./cursor-mock"),
    util        = require("util"),
    uuid        = require('node-uuid'),
    empty       = "";

function PostProvider(connStr, options) {
    Provider.call(this, connStr, options);
    this.store = [];
}

util.inherits(PostProvider, Provider);

PostProvider.prototype._insert = function (item, callback) {
    "use strict";
    
    var that    = this,
        id      = that._getId(item);
    
    if (!id) {
        id = uuid.v1();
        item[this.options.identifier] = id;
    }
    
    process.nextTick(function () {
        var sid = empty + id;
        if (that.store[sid]) {
            callback(new Error("Item exists."));
        } else {
            that.store[sid] = item;
            callback(null, item);
        }
    });
};

PostProvider.prototype._upsert = function (item, callback) {
    "use strict";
    
    var that    = this,
        id      = that._getId(item);
    
    if (!id) {
        id = uuid.v1();
        item[this.options.identifier] = id;
    }
    
    process.nextTick(function () {
        that.store[empty + id] = item;
        callback(null, item);
    });
};

PostProvider.prototype._update = function (item, callback) {
    "use strict";
    
    var that    = this,
        id      = that._getId(item);
    
    if (!id) {
        callback(new Error("Identifier not specified."));
    }
    
    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            callback(new Error("Item doesn't exists."));
        } else {
            that.store[sid] = item;
            callback(null, item);
        }
    });
};

PostProvider.prototype._get = function (item, callback) {
    "use strict";
    
    var that    = this,
        id      = that._getId(item);
    
    if (!id) {
        callback(new Error("Identifier not specified."));
    }
    
    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            callback(new Error("Item doesn't exists."));
        } else {
            callback(null, that.store[sid]);
        }
    });
};

PostProvider.prototype._delete = function (item, callback) {
    "use strict";
    
    var that    = this,
        id      = that._getId(item);
    
    if (!id) {
        callback(new Error("Identifier not specified."));
    }
    
    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            callback(new Error("Item doesn't exists."));
        } else {
            delete that.store[sid];
            callback(null, item);
        }
    });
};

PostProvider.prototype._select = function (args, callback) {
    callback(null, new Cursor(this, args.query, args.projection, args.options));
};

module.exports = exports = PostProvider;
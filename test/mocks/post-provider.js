/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */
/*global require, module */

var Provider    = require("../../lib/provider"),
    Cursor      = require("./cursor-mock"),
    util        = require("util"),
    uuid        = require('node-uuid'),
    _           = require("lodash"),
    empty       = "";

function PostProvider(connStr, options) {
    Provider.call(this, connStr, options);
    this.store = [];
    this.sync = false;
}

util.inherits(PostProvider, Provider);

PostProvider.prototype._insert = function (items, callback) {
    "use strict";

    var that    = this;

    function storeItem (item) {
        var id = that._getId(item);

        if (!id) {
            id = uuid.v1();
            item[that.options.identifier] = id;
        }

        var sid = empty + id;
        if (that.store[sid]) {
            that.handleError("Item exists.", callback);
        } else {
            that.store[sid] = item;
        }
    }

    process.nextTick(function () {
        if (_.isArray(items)) {
            _.each(items, function (item) {
                storeItem(item);
            });
        } else {
            storeItem(items);
        }
        if (callback) {
            callback(null, items);
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
        if (callback) {
            callback(null, item);
        }
    });
};

PostProvider.prototype._update = function (item, callback) {
    "use strict";

    var that    = this,
        id      = that._getId(item);

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            that.store[sid] = item;
            if (callback) {
                callback(null, item);
            }
        }
    });
};

PostProvider.prototype._get = function (item, callback) {
    "use strict";

    var that    = this,
        id      = that._getId(item);

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            if (callback) {
                callback(null, that.store[sid]);
            }
        }
    });
};

PostProvider.prototype._delete = function (item, callback) {
    "use strict";

    var that    = this,
        id      = that._getId(item);

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    process.nextTick(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            delete that.store[sid];
            if (callback) {
                callback(null, item);
            }
        }
    });
};

PostProvider.prototype._select = function (args, callback) {
    var cursor = new Cursor(this, args.query, args.options);
    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = PostProvider;

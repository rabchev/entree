/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

"use strict";

var Provider    = require("../../lib/provider"),
    Cursor      = require("./cursor-mock"),
    util        = require("util"),
    uuid        = require('node-uuid'),
    _           = require("lodash"),
    empty       = "";

function PostProvider(options, schema) {
    Provider.call(this, options, schema);
    this.store = {};
    this.sync = false;
    this.insertCalls = 0;
    this.upsertCalls = 0;
    this.getCalls = 0;
    this.updateCalls = 0;
    this.selectCalls = 0;
    this.deleteCalls = 0;
    this.delay = 0;
}

util.inherits(PostProvider, Provider);

PostProvider.prototype._insert = function (items, callback) {
    var that    = this;

    this.insertCalls++;

    function storeItem(item) {
        var id = that._getId(item);

        if (!id) {
            id = uuid.v1();
            item[that.schema.identifier] = id;
        }

        var sid = empty + id;
        if (that.store[sid]) {
            that.handleError("Item exists.", callback);
        } else {
            that.store[sid] = item;
        }
    }

    setTimeout(function () {
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
    }, this.delay);
};

PostProvider.prototype._upsert = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    this.upsertCalls++;

    if (!id) {
        id = uuid.v1();
        item[this.schema.identifier] = id;
    }

    setTimeout(function () {
        that.store[empty + id] = item;
        if (callback) {
            callback(null, item);
        }
    }, this.delay);
};

PostProvider.prototype._update = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    this.updateCalls++;

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    setTimeout(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            that.store[sid] = item;
            if (callback) {
                callback(null, item);
            }
        }
    }, this.delay);
};

PostProvider.prototype._get = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    this.getCalls++;

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    setTimeout(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            if (callback) {
                callback(null, that.store[sid]);
            }
        }
    }, this.delay);
};

PostProvider.prototype._delete = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    this.deleteCalls++;

    if (!id) {
        return this.handleError("Identifier not specified.", callback);
    }

    setTimeout(function () {
        var sid = empty + id;
        if (!that.store[sid]) {
            that.handleError("Item does not exist.", callback);
        } else {
            delete that.store[sid];
            if (callback) {
                callback(null, item);
            }
        }
    }, this.delay);
};

PostProvider.prototype._select = function (args, callback) {
    var cursor = new Cursor(this, args.query, args.options);

    this.selectCalls++;

    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = PostProvider;

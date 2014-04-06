/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

"use strict";

var Provider    = require("../../lib/provider"),
    object      = require("../../lib/utils/object"),
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

function update(prov, item, insert, callback) {
    var idKey   = prov._getIdKey(),
        id      = prov._getId(item);

    setTimeout(function () {
        var sid = empty + id,
            trg = prov.store[sid];

        if (insert) {
            if (!trg) {
                trg = {};
                if (!id) {
                    id = uuid.v1();
                }
            } else {
                insert = false;
            }
        }

        if (!id) {
            return prov.handleError("Identifier not specified.", callback);
        }

        if (!trg) {
            prov.handleError("Item does not exist.", callback);
        } else {
            try {
                item = object.update(item, trg, insert, idKey);
            } catch (err) {
                prov.handleError(err, callback);
            }
            item[idKey] = id;
            prov.store[sid] = item;
            if (callback) {
                callback(null, item);
            }
        }
    }, prov.delay);
}

util.inherits(PostProvider, Provider);

PostProvider.prototype._insert = function (items, callback) {
    var that    = this,
        failed,
        i;

    this.insertCalls++;

    function storeItem(item) {
        var id = that._getId(item);

        if (!id) {
            id = uuid.v1();
            that._setId(item, id);
        }

        var sid = empty + id;
        if (that.store[sid]) {
            that.handleError("Item exists.", callback);
            failed = true;
            return false;
        } else {
            that.store[sid] = item;
        }
        return true;
    }

    setTimeout(function () {
        if (_.isArray(items)) {
            for (i = 0; i < items.length; i++) {
                if (object.validateKeys(items[i]) !== "fields") {
                    return that.handleError("OPERS_NOT_ALLOWED", callback);
                }
            }
            _.each(items, function (item) {
                return storeItem(item);
            });
        } else {
            if (object.validateKeys(items) !== "fields") {
                return that.handleError("OPERS_NOT_ALLOWED", callback);
            }
            storeItem(items);
        }
        if (callback && !failed) {
            callback(null, items);
        }
    }, this.delay);
};

PostProvider.prototype._upsert = function (item, callback) {
    this.upsertCalls++;
    update(this, item, true, callback);
};

PostProvider.prototype._update = function (item, callback) {
    this.updateCalls++;
    update(this, item, false, callback);
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
            that.handleError("ITEM_DOESNOT_EXIST", callback);
        } else {
            if (callback) {
                callback(null, _.cloneDeep(that.store[sid]));
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

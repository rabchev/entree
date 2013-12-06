/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var cache_manager   = require("cache-manager"),
    _               = require("lodash");

function getCursorKey(cursor) {
    return cursor.provider.uuid +
        JSON.stringify(cursor.query) +
        cursor.skipValue  +
        cursor.limitValue +
        (cursor.mapping || "") +
        (cursor.criteria || "");
}

exports.interception = function (stores, actions) {
    var cache, _stores, i;

    if (!stores) {
        cache = cache_manager.caching({ store: "memory", max: 1000, ttl: 10 });
    } else if (_.isArray(stores)) {
        if (stores.length === 1) {
            cache = cache_manager.caching(stores[0]);
        } else {
            _stores = [];
            _.each(stores, function (store) {
                _stores.push(cache_manager.caching(store));
            });
            cache = cache_manager.multi_caching(_stores);
        }
    } else {
        cache = cache_manager.caching(stores);
    }

    if (actions) {
        if (!_.isArray(actions)) {
            actions = [actions];
        }

        for (i = 0; i < actions.length; i++) {
            if (actions[i].charAt(0) !== "_") {
                actions[i] = "_" + actions[i];
            }
        }
    }

    function wrapCursor(cursor, done) {
        var key = getCursorKey(cursor);

        cache.get(key, function (err, result) {
            if (err) {
                return done(err);
            }
        });
    }

    return function (action, context, item, next, out) {
        if (!out) {
            throw new Error("Cache interceptor is asynchronous and therefore it requires a callback function.");
        }

        var key;

        if (actions && actions.indexOf(action) === -1) {
            return next(item, out);
        }

        switch (action) {
        case "_insert":
        case "_upsert":
        case "_update":
            key = this._getId(item);
            cache.set(key, item);
            return next(item, out);
        case "_delete":
            key = this._getId(item);
            cache.del(key);
            return next(item, out);
        case "_get":
            key = this._getId(item);
            return cache.wrap(key, function (cb) { next(item, cb); }, out);
        case "_select":
            return next(item, function (err, res) {
                if (!err) {
                    out(err);
                }
                wrapCursor(res, out);
            });
        }
    };
};

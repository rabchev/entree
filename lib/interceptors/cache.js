/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

/**
 * Interception module for caching the results returned by the intercepted methods.
 *
 * **IMPORTANT:** this interceptor breaks the call chain and returns immediately if the requested item is cached, therefore subsequent interceptors and the method itself will not be invoked.
 *
 * The interceptor uses [node-cache-manager](https://github.com/BryanDonovan/node-cache-manager) library for caching.
 * Please refer to **node-cache-manager** [documentation](https://github.com/BryanDonovan/node-cache-manager) for more details on configuration and usage.
 *
 * For more details on using interceptors please see the {@tutorial interceptors} tutorial.
 *
 * @example
 *  var entree  = require("entree"),
 *      cache     = entree.resolveInterceptor("cache"),
 *      stores    = [
 *          { store: "memory", max: 1000, ttl: 10 },
 *          { store: require("./redis_store"), db: 0, ttl: 100 }
 *      ];
 *
 * entree.posts.use(cache.interception(stores, ["get"]));
 *
 * @module cache
 */

"use strict";

var cache_manager   = require("cache-manager"),
    _               = require("lodash");

function getCursorKey(cursor) {
    return cursor.provider._uuid +
        JSON.stringify(cursor.query) +
        cursor.skipValue  +
        cursor.limitValue +
        (cursor.mapping || "") +
        (cursor.criteria || "");
}

/**
 * Configures and returns an interceptor function.
 * @param {object=} stores - defines the cache stores. By default only memory store is used with the following configuration: `{ store: "memory", max: 1000, ttl: 10 }`.
 * @param {(string|string[])=} actions - Specifies which actions (methods) should be cached. Could be single action or an array of actions. If omitted, all actions are cached.
 *  Possible values are: `["insert", "upsert", "update", "get", "delete", "select"]`
 */
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

        cache.get(key, function (err, entry) {
            if (err) {
                return done(err);
            }

            var current         = 0,
                items           = [],
                _nextObject     = cursor._nextObject,
                _count          = cursor.count;

            if (!entry) {
                entry = {};
            }

            cursor._nextObject = function (callback) {
                if (entry.items) {
                    callback(null, entry.items[current++]);
                } else {
                    _nextObject.call(cursor, function (err, item) {
                        if (!err) {
                            if (item) {
                                items.push(item);
                            } else {
                                entry.items = items;
                                cache.set(key, entry);
                            }
                        }
                        callback(err, item);
                    });
                }
            };

            cursor.count = function (callback) {
                if (entry.count) {
                    callback(null, entry.count);
                } else {
                    _count.call(cursor, function (err, count) {
                        if (!err) {
                            entry.count = count;
                            cache.set(key, entry);
                        }
                        callback(err, count);
                    });
                }
            };

            done(null, cursor);
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
                if (err) {
                    return out(err);
                }
                wrapCursor(res, out);
            });
        }
    };
};

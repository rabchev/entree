/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var cache_manager   = require("cache-manager"),
    _               = require("lodash");

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

    return function (action, context, item, next, out) {
        var key;

        if (actions || actions.indexOf(action) === -1) {
            return next(item, out);
        }

        switch (action) {
        case "_insert":
        case "_upsert":
        case "_update":
            key = this.provider._getId(item);
            cache.set(key, item);
            break;
        case "_delete":
            key = this.provider._getId(item);
            cache.del(key);
            break;
        case "_get":
            key = this.provider._getId(item);
            cache.wrap(key, function (cb) { next(item, cb); }, out);
            break;
        case "_select":
            key = JSON.stringify(item);
            cache.wrap(key, function (cb) { next(item, cb); }, out);
            break;
        }
    };
};

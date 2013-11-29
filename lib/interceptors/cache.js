/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var cache_manager   = require("cache-manager"),
    _               = require("lodash");

exports.interception = function (stores, actions) {
    var cache, _stores;

    if (!stores) {
        cache = cache_manager.caching({ store: "memory", max: 1000, ttl: 10 });
    } else if (_.isArray(stores)) {
        _stores = [];
        _.each(stores, function (store) {
            _stores.push(cache_manager.caching(store));
        });
        cache = cache_manager.multi_caching(_stores);
    } else {
        cache = cache_manager.caching(stores);
    }

    return function (action, context, item, next, out) {
        if (actions || actions.indexOf(action) === -1) {
            return next(item, out);
        }

        switch (action) {
        case "_insert":
        case "_upsert":
        case "_update":
            cache.set("", item);
            break;
        case "_delete":
            cache.set("");
            break;
        case "_get":
            cache.wrap("", function (cache_callback) {
                //get_user(id, cache_callback);
            }, function (err, cachedItem) {
                if (err) {
                    return out(err);
                }
                next(cachedItem, out);
            });
            break;
        case "_select":
            break;
        }
    };
};

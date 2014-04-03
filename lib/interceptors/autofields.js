/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

/**
 * Interception module for creating and updating fields automatically.
 * That is, fields that don't have to be explicitly set on a document.
 *
 * The folowing fields are supported:
 *
 * | Type               | Default field name    | Description                                                               |
 * |--------------------|-----------------------|---------------------------------------------------------------------------|
 * | Created At         | _createdAt            | Date and time when the item was first added to the collection.            |
 * | Created By         | _createdBy            | The identifier of the user that first added the item to the collection.   |
 * | Last Modified      | _lastModified         | Date and time of the last update of the item.                             |
 * | Modified By        | _modifiedBy           | The identifier of the user that made the last update of the item.         |
 * | Version            | _version              | The number of times the item was successfully updated.                    |
 *
 * For more details on using interceptors please see the {@tutorial interceptors} tutorial.
 *
 * @example
 *  var entree      = require("entree"),
 *      autofields  = entree.resolveInterceptor("autofields");
 *
 * entree.posts.use(autofields.interception({ createdAt: true, version: "_myUpdateCountField" }));
 *
 * @module autofields
 */

"use strict";

var object  = require("../utils/object");

function tryToFind(val) {
    var type = typeof val;
    if (type === "string" || type === "number") {
        return val;
    }

    return val._id || val.username || val.email || val.name;
}

function getUserIdentity(context) {
    if (context) {
        var user = tryToFind(context);
        if (user) {
            return user;
        }
        return tryToFind(context.user);
    }
    return null;
}

function updateAutoFields(item, context, opts, upsert) {
    var identity, date;

    if (object.validateKeys(item) === "fields") {
        if (opts.createdAt) {
            item[opts.createdAt] = date = new Date();
        }

        if (opts.createdBy) {
            item[opts.createdBy] = identity = getUserIdentity(context);
        }

        if (opts.version) {
            item[opts.version] = 1;
        }

        if (opts.lastModified) {
            item[opts.lastModified] = date || new Date();
        }

        if (opts.modifiedBy) {
            item[opts.modifiedBy] = identity || getUserIdentity(context);
        }
    } else {
        if (upsert && (opts.createdAt || opts.createdBy)) {
            if (!item.$setOnInsert) {
                item.$setOnInsert = {};
            }

            if (opts.createdAt) {
                item.$setOnInsert[opts.createdAt] = date = new Date();
            }

            if (opts.createdBy) {
                item.$setOnInsert[opts.createdBy] = identity = getUserIdentity(context);
            }
        }

        if (opts.version) {
            if (!item.$inc) {
                item.$inc = {};
            }
            item.$inc[opts.version] = 1;
        }

        if (opts.lastModified || opts.modifiedBy) {
            if (!item.$set) {
                item.$set = {};
            }

            if (opts.lastModified) {
                item.$set[opts.lastModified] = date || new Date();
            }

            if (opts.modifiedBy) {
                item.$set[opts.modifiedBy] = identity || getUserIdentity(context);
            }
        }
    }
}

function wrapCursor(cursor, context, opts) {
    var orgFn = cursor.update;
    cursor.update = function (data, callback) {
        updateAutoFields(data, context, opts);
        orgFn.call(cursor, data, callback);
    };
    return cursor;
}

/**
 * Configures and returns an interceptor function.
 *
 * Options
 *
 * - `createdAt` {(boolean|string)=} - if true, defaults to "_createdAt".
 * - `createdBy` {(boolean|string)=} - if true, defaults to "_createdBy".
 * - `lastModified` {(boolean|string)=} - if true, defaults to "_lastModified".
 * - `modifiedBy` {(boolean|string)=} - if true, defaults to "_modifiedBy".
 * - `version` {(boolean|string)=} - if true, defaults to "_version".
 *
 * If any of the options is a string, then the value is used for field name for that option.
 * If options are omitted, all supported fields will be configured with their default names.
 *
 * @param {object=} opts - Autofields options, defines which auto-fileds should be handled and their names.
 * @return {function}
 */
exports.interception = function (opts) {
    if (!opts) {
        opts = {
            createdAt       : "_createdAt",
            createdBy       : "_createdBy",
            lastModified    : "_lastModified",
            modifiedBy      : "_modifiedBy",
            version         : "_version"
        };
    } else {
        if (opts.createdAt && typeof opts.createdAt !== "string") {
            opts.createdAt = "_createdAt";
        }
        if (opts.createdBy && typeof opts.createdBy !== "string") {
            opts.createdBy = "_createdBy";
        }
        if (opts.lastModified && typeof opts.lastModified !== "string") {
            opts.lastModified = "_lastModified";
        }
        if (opts.modifiedBy && typeof opts.modifiedBy !== "string") {
            opts.modifiedBy = "_modifiedBy";
        }
        if (opts.version && typeof opts.version !== "string") {
            opts.version = "_version";
        }
    }

    return function (action, context, item, next, out) {
        try {
            switch (action) {
            case "_insert":
            case "_update":
                updateAutoFields(item, context, opts);
                break;
            case "_upsert":
                updateAutoFields(item, context, opts, true);
                break;
            case "_select":
                if (out) {
                    next(item, function (err, cur) {
                        if (cur) {
                            wrapCursor(cur, context, opts);
                        }
                        out(err, cur);
                    });
                } else {
                    return wrapCursor(next(item), context, opts);
                }
                return;
            }
            next(item, out);
        } catch (err) {
            if (out) {
                return out(err);
            }
            throw err;
        }
    };
};

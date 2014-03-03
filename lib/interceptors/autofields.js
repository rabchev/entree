/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

// TODO: Autofields don't have tests.

function getUserIdentity(context) {
    if (context && context.user) {
        var user = context.user;
        if (typeof user === "string") {
            return user;
        }
        return user._id || user.username || user.email;
    }
}

function updateAutoFields(item, context, opts, insert) {
    var identity, date;
    if (insert) {
        item[opts.createdAt] = date = new Date().toISOString();

        if (context && opts.createdBy) {
            item[opts.createdBy] = identity = getUserIdentity(context);
        }
    }

    if (opts.version) {
        var fld = {};
        fld[opts.version] = 1;
        item.$inc = fld;
    }

    if (opts.lastModified) {
        item[opts.lastModified] = date || new Date().toISOString();
    }

    if (context && opts.modifiedBy) {
        item[opts.modifiedBy] = identity || getUserIdentity(context);
    }
}

function wrapCursor(cursor, context, opts) {
    var orgFn = cursor.update;
    cursor.update = function (data, callback) {
        updateAutoFields(data, context, opts);
        orgFn.call(cursor, data, callback);
    };
}

exports.interception = function (opts) {
    if (!opts) {
        opts = {
            createdAt       : "_createdAt",
            createdBy       : "_createdBy",
            lastModified    : "_lastModified",
            lastModifiedBy  : "_lastModifiedBy",
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
        if (opts.lastModifiedBy && typeof opts.lastModifiedBy !== "string") {
            opts.lastModifiedBy = "_lastModifiedBy";
        }
        if (opts.version && typeof opts.version !== "string") {
            opts.version = "_version";
        }
    }

    return function (action, context, item, next, out) {
        switch (action) {
        case "_insert":
            updateAutoFields(item, context, opts, true);
            break;
        case "_update":
        case "_upsert":
            updateAutoFields(item, context, opts);
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
                wrapCursor(next(item), context, opts);
            }
            return;
        }
        next(item, out);
    };
};

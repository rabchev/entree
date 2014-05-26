"use strict";

var _               = require("lodash"),
    Cursor          = require("../../lib/cursor"),
    permissions     = {
        read: [
            "Managers",
            "Contributers",
            "Users"
        ],
        create: [
            "Managers",
            "Contributers"
        ],
        modify: [
            "Managers",
            "Contributers"
        ],
        delete: [
            "Managers"
        ]
    };


exports.logdata = [];

exports.security = function (action, context, item, next, out) {
    var perm;

    if (!context || context.__isEmpty) {
        return next(item, out);
    }

    switch (action) {
    case "_insert":
        perm = "create";
        break;
    case "_upsert":
    case "_update":
        perm = "modify";
        break;
    case "_delete":
        perm = "delete";
        break;
    case "_get":
    case "_select":
        perm = "read";
        break;
    }

    var roles = context.user.roles || [],
        intersection = _.intersection(roles, permissions[perm]);

    if (intersection.length === 0) {

        var err = new Error("Access denied!");
        if (out) {
            out(err);
        } else {
            throw err;
        }
    } else {
        exports.logdata.push({ action: action, message: "Security check passed." });
        return next(item, out);
    }
};

exports.logging = function (action, context, item, next, out) {

    function handleResult(err, item) {
        var msg = err ? "failed:" + err.message : "success";
        exports.logdata.push({ action: action, message: msg });
        out(err, item);
    }

    var result = next(item, out ? handleResult : null);
    if (result) {
        if (result instanceof Cursor) {
            exports.logdata.push({ action: action, message: "Cursor returned" });
        } else {
            exports.logdata.push({ action: action, message: "Unexpected result returned" });
        }
    }
    return result;
};

exports.timestamp = function (action, context, item, next, out) {

    function wrapper(err, item, callback) {
        if (item) {
            item.timestamp = new Date();
        }
        callback(err, item);
    }

    function handleResult(err, item) {
        if (!err && item) {
            switch (action) {
            case "_update":
            case "_insert":
            case "_upsert":
            case "_delete":
            case "_get":
                item.timestamp = new Date();
                break;
            case "_select":
                item.wrapCallback("_nextObject", wrapper);
                break;
            }
        }
        out(err, item);
    }

    var result = next(item, out ? handleResult : null);
    if (result) {
        result.wrapCallback("_nextObject", wrapper);
    }
    return result;
};

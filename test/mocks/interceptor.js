/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var _               = require("underscore"),
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
    "use strict";
    
    var perm;
    
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
        debugger;
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
    "use strict";
    
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
    "use strict";
    
    function handleResult(err, item) {
        if (!err && item) {
            switch (action) {
            case "_update":
            case "_insert":
            case "_upsert":
            case "_delete":
                item.timestamp = new Date();
                break;
            case "_select":
                
                break;
            }
        }
        out(err, item);
    }
    
    next(item, handleResult);
};
/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

exports.logdata = [];

exports.security = function (action, context, item, next, out) {
    switch (action) {
    case "_update":
            
        break;
    case "_insert":
            
        break;
    case "_upsert":
            
        break;
    case "_delete":
            
        break;
    case "_select":
            
        break;
    }
};
            
exports.logging = function (action, context, item, next, out) {
    "use strict";
    
    function handleResult(err, item) {
        var msg = err ? "failed:" + err.message : "success";
        exports.logdata.push({ action: action, message: msg });
        out(err, item);
    }
    
    next(item, handleResult);
};
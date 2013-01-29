/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

function Cursor(provider, query, projection, options) {
    "use strict";
    
    this.provider   = provider;
    this.query      = query;
    this.projection = projection;
    
    var opt         = options || {};
    this.sort       = opt.sort;
    this.skip       = opt.skip || 0;
    this.limit      = opt.limit || 0;
    this.queryRun   = false;
    this.state      = Cursor.INIT;
}

Cursor.prototype.limit = function (limit, callback) {
    "use strict";
    
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        if (callback) {
            callback(new Error("Cursor is closed"));
        } else {
            throw new Error("Cursor is closed");
        }
    } else {
        if (limit !== null && limit.constructor !== Number) {
            if (callback) {
                callback(new Error("limit requires an integer"));
            } else {
                throw new Error("limit requires an integer");
            }
        } else {
            this.limit = limit;
            if (callback) {
                return callback(null, this);
            }
        }
    }
    
    return this;
};

Cursor.prototype.skip = function (skip, callback) {
    "use strict";
    
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        if (callback) {
            callback(new Error("Cursor is closed"));
        } else {
            throw new Error("Cursor is closed");
        }
    } else {
        if (skip !== null && skip.constructor !== Number) {
            if (callback) {
                callback(new Error("limit requires an integer"));
            } else {
                throw new Error("limit requires an integer");
            }
        } else {
            this.skip = skip;
            if (callback) {
                return callback(null, this);
            }
        }
    }
    
    return this;
};

/**
 * Init state
 *
 * @classconstant INIT
 **/
Cursor.INIT = 0;

/**
 * Cursor open
 *
 * @classconstant OPEN
 **/
Cursor.OPEN = 1;

/**
 * Cursor closed
 *
 * @classconstant CLOSED
 **/
Cursor.CLOSED = 2;
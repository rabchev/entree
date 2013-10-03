/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var util        = require("util"),
    timers      = require('timers'),
    Strings     = require("./strings"),
    _           = require("underscore");

/**
 * Constructor for a cursor object that handles all the operations on query result
 * using select. This cursor object is unidirectional and cannot traverse backwards. Clients should not be creating a cursor directly,
 * but use select to acquire a cursor.
 *
 * Options
 *  - **skip** {Number} skip number of documents to skip.
 *  - **limit** {Number}, limit the number of results to return. -1 has a special meaning and is used by Db.eval. A value of 1 will also be treated as if it were -1.
 *  - **sort** {Array | Object}, set to sort the documents coming back from the query. Array of indexes, [['a', 1]] etc.
 *
 * @class Represents a Cursor.
 * @param {Object} provider the provider that created this cursor.
 * @param {Object} query an object containing the conditions that have to match to include a document in the result set.
 * @param {Object} [options] additional options for the collection.
*/
function Cursor(provider, query, options) {
    this.provider   = provider;
    this.query      = query;

    var opt         = options || {};
    this.mapping    = opt.map;
    this.sortValue  = opt.sort;
    this.skipValue  = opt.skip || 0;
    this.limitValue = opt.limit || 0;
    this.queryRun   = false;
    this.state      = Cursor.INIT;

    this.reset();
}

/**
 * Sets the limit parameter of this cursor to the given value.
 *
 * @param {Number} limit the new limit.
 * @param {Function} [callback] this optional callback will be called after executing this method. The first parameter will contain an error object when the limit given is not a valid number or when the cursor is already closed while the second parameter will contain a reference to this object upon successful execution.
 * @return {Cursor} an instance of this object.
 * @api public
 */
Cursor.prototype.limit = function (limit, callback) {
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        var err = new Error(Strings.CURSOR_CLOSED);
        if (callback) {
            callback(err);
        } else {
            throw new Error(err);
        }
    } else {
        if (limit !== null && limit.constructor !== Number) {
            var msg = util.format(Strings.REQUIRES_INT, "limit"),
                errInt = new Error(msg);
            if (callback) {
                callback(errInt);
            } else {
                throw errInt;
            }
        } else {
            this.limitValue = limit;
            this.reset();
            if (callback) {
                return callback(null, this);
            }
        }
    }

    return this;
};

/**
 * Sets the skip parameter of this cursor to the given value.
 *
 * @param {Number} skip the new skip value.
 * @param {Function} [callback] this optional callback will be called after executing this method. The first parameter will contain an error object when the skip value given is not a valid number or when the cursor is already closed while the second parameter will contain a reference to this object upon successful execution.
 * @return {Cursor} an instance of this object.
 * @api public
 */
Cursor.prototype.skip = function (skip, callback) {
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        var err = new Error(Strings.CURSOR_CLOSED);
        if (callback) {
            callback(err);
        } else {
            throw err;
        }
    } else {
        if (skip !== null && skip.constructor !== Number) {
            var msg = util.format(Strings.REQUIRES_INT, "skip"),
                errInt = new Error(msg);
            if (callback) {
                callback(errInt);
            } else {
                throw errInt;
            }
        } else {
            this.skipValue = skip;
            this.reset();
            if (callback) {
                return callback(null, this);
            }
        }
    }

    return this;
};

/**
 * Sets the sort parameter of this cursor to the given value.
 *
 * @param {Object|Function}
 * @param {Function} callback this will be called after executing this method. The first parameter will contain an error object when the cursor is already closed while the second parameter will contain a reference to this object upon successful execution.
 * @return {Cursor} an instance of this object.
 * @api public
 */
Cursor.prototype.sort = function (criteria, callback) {

    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        callback(new Error(Strings.CURSOR_CLOSED));
    } else {
        if (_.isFunction(criteria)) {
            this.comparer = criteria;
        } else {
            this.sortValue = criteria;
        }
        this.reset();
        if (callback) {
            callback(null, this);
        }
    }

    return this;
};

Cursor.prototype.comparer = function (a, b) {

};

Cursor.prototype.map = function (mapping) {
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        throw new Error(Strings.CURSOR_CLOSED);
    } else {
        this.mapping = mapping;
        this.reset();
    }

    return this;
};

/**
 * Returns an array of documents. The caller is responsible for making sure that there
 * is enough memory to store the results. Note that the array only contain partial
 * results when this cursor had been previouly accessed. In that case,
 * cursor.rewind() can be used to reset the cursor.
 *
 * @param {Function} callback This will be called after executing this method successfully. The first parameter will contain the Error object if an error occured, or null otherwise. The second parameter will contain an array of objects as a result of the query.
 * @return {null}
 * @api public
 */
Cursor.prototype.toArray = function (callback) {
    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }

    var items   = [];

    this.each(function (err, item) {
        if (err) {
            return callback(err);
        }

        if (item) {
            items.push(item);
        } else {
            callback(null, items);
        }
    });
};

/**
 * Iterates over all the documents for this cursor. As with **{cursor.toArray}**,
 * not all of the elements will be iterated if this cursor had been previouly accessed.
 *
 * @param {Function} callback this will be called for while iterating every document of the query result. The first parameter will contain the Error object if an error occured, or null otherwise. While the second parameter will contain the document.
 * @return {null}
 * @api public
 */
Cursor.prototype.each = function (callback) {
    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }

    var that = this;
    this.next(function (err, item) {
        callback(err, item);
        if (item) {
            timers.setImmediate(function () {
                that.each(callback);
            });
        }
    });
};

/**
 * Gets the next object from the cursor.
 *
 * @param {Function} callback this will be called after executing this method. The first parameter will contain an error object on error while the second parameter will contain a object from the returned result or null if there are no more results.
 * @api public
 */
Cursor.prototype.next = function (callback) {
    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }

    if (!this.queryRun) {
        this.queryRun = true;
        this.state = Cursor.OPEN;
    }

    if (this.state === Cursor.CLOSED) {
        callback(new Error(Strings.CURSOR_CLOSED));
    } else {
        this._nextObject(function (err, item) {
            if (err) {
                this.state = Cursor.CLOSED;
            }

            callback(err, item);
        });
    }
};

Cursor.prototype.reset = function () {
    // abstract
    throw new Error(Strings.NOT_IMPLEMENTED);
};

Cursor.prototype._nextObject = function (callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
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

module.exports = Cursor;

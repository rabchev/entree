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
    this.skipValue  = opt.skip || 0;
    this.limitValue = opt.limit || 0;
    this.queryRun   = false;
    this.state      = Cursor.INIT;
    this._crtKeys   = null;

    if (_.isFunction(opt.sort)) {
        this.comparer = opt.sort;
    } else {
        this.criteria = opt.sort;
    }

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
        this._crtKeys = null;
        this.criteria = criteria;
        this.reset();
        if (callback) {
            callback(null, this);
        }
    }

    return this;
};

Cursor.prototype.comparer = function (a, b) {

    function getValue(obj, paths) {
        var current = obj, i;

        for (i = 0; i < paths.length; ++i) {
            if (current[paths[i]] === undefined) {
                return undefined;
            } else {
                current = current[paths[i]];
            }
        }
        return current;
    }

    function compare(_key, _a, _b) {
        var va = getValue(_a, _key.paths),
            vb = getValue(_b, _key.paths);

        if (!va && !vb) {
            return 0;
        }

        if (!va) {
            return -1;
        }

        if (!vb) {
            return 1;
        }

        if (_key.isStr) {
            return va.localeCompare(vb);
        }

        return va - vb;
    }

    var key, val, i;

    if (!this._crtKeys) {
        this._crtKeys = [];

        for (key in this.criteria) {
            if (this.criteria.hasOwnProperty(key)) {
                this._crtKeys.push({
                    name: key,
                    paths: key.split("."),
                    isStr: typeof a[key] === "string"
                });
            }
        }
    }

    for (i = 0; i < this._crtKeys.length; i++) {
        key = this._crtKeys[i];
        val = this.criteria[key.name] < 0 ? compare(key, b, a) : compare(key, a, b);
        if (val !== 0) {
            break;
        }
    }

    return val;
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

    var that = this,
        list = [];

    this.exec(function (err) {
        if (err) {
            callback(err);
        } else {
            if (that.items) {
                return callback(null, that.items);
            }

            that.each(function (err, item) {
                if (err) {
                    return callback(err);
                }

                if (item) {
                    list.push(item);
                } else {
                    that.items = list;
                    callback(null, that.items);
                }
            });
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
    var i,
        that = this;

    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }

    function visit() {
        that.next(function (err, item) {
            callback(err, item);
            if (item) {
                timers.setImmediate(function () {
                    visit();
                });
            }
        });
    }

    this.exec(function (err) {
        if (err) {
            callback(err);
        } else {
            if (that.items) {
                for (i = 0; i < that.items.length; i++) {
                    callback(null, that.items[i]);
                }
                callback(null, null);
            } else {
                visit();
            }
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
    var that = this;

    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }

    this.exec(function (err) {
        if (err) {
            return callback(err);
        }

        that._nextObject(function (err, item) {
            if (err) {
                that.state = Cursor.CLOSED;
            }

            callback(err, item);
        });
    });
};

Cursor.prototype.count = function (callback) {
    var that = this;
    this.exec(function (err) {
        if (err) {
            callback(err);
        } else {
            if (that.items) {
                callback(null, that.items.length);
            } else {
                that.toArray(function (err, array) {
                    callback(err, array.length);
                });
            }
        }
    });
};

Cursor.prototype.exec = function (callback) {
    var that = this;
    if (this.queryRun) {
        if (this.state === Cursor.CLOSED) {
            callback(new Error(Strings.CURSOR_CLOSED));
        } else {
            callback(null);
        }
    } else {
        this.queryRun = true;
        this.state = Cursor.OPEN;
        this._exec(function (err) {
            if (err) {
                that.state = Cursor.CLOSED;
            }
            callback(err);
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

Cursor.prototype._exec = function (callback) {
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

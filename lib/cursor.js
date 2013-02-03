/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var util        = require("util"),
    Strings     = require("./strings");

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
 * @param {Db} db the database object to work with.
 * @param {Collection} collection the collection to query.
 * @param {Object} query an object containing the conditions that have to match to include a document in the result set.
 * @param {Object} projection an object containing what fields to include or exclude from objects returned.
 * @param {Object} [options] additional options for the collection.
*/
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

/**
 * Sets the limit parameter of this cursor to the given value.
 *
 * @param {Number} limit the new limit.
 * @param {Function} [callback] this optional callback will be called after executing this method. The first parameter will contain an error object when the limit given is not a valid number or when the cursor is already closed while the second parameter will contain a reference to this object upon successful execution.
 * @return {Cursor} an instance of this object.
 * @api public
 */
Cursor.prototype.limit = function (limit, callback) {
    "use strict";
    
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
            this.limit = limit;
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
    "use strict";
    
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
            this.skip = skip;
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
 * This method has the following method signatures:
 * (keyOrList, callback)
 * (keyOrList, direction, callback)
 *
 * @param {String|Array|Object} keyOrList This can be a string or an array. If passed as a string, the string will be the field to sort. If passed an array, each element will represent a field to be sorted and should be an array that contains the format [string, direction].
 * @param {String|Number} direction this determines how the results are sorted. "asc", "ascending" or 1 for asceding order while "desc", "desceding or -1 for descending order. Note that the strings are case insensitive.
 * @param {Function} callback this will be called after executing this method. The first parameter will contain an error object when the cursor is already closed while the second parameter will contain a reference to this object upon successful execution.
 * @return {Cursor} an instance of this object.
 * @api public
 */
Cursor.prototype.sort = function (keyOrList, direction, callback) {
    "use strict";
        
    if (typeof direction === "function") {
        callback = direction;
        direction = null;
    }
    
    if (this.queryRun === true || this.state === Cursor.CLOSED) {
        callback(new Error(Strings.CURSOR_CLOSED));
    } else {
        var order = keyOrList;
        
        if (direction !== null) {
            order = [[keyOrList, direction]];
        }
    
        this.sort = order;
        if (callback) {
            callback(null, this);
        }
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
    "use strict";
    
    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }
    
    var self    = this,
        items   = [],
        sync;
    
    function populate() {
        
        function next(err, result, isSync) {
            if (result) {
                items.push(result);
                if (isSync) {
                    sync = true;
                } else {
                    populate();
                }
            } else {
                callback(err, items);
            }
        }
        
        do {
            sync = false;
            self.nextObject(next);
        } while (sync);
    }
    
    populate();
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
    "use strict";
    
    if (!callback) {
        throw new Error(util.format(Strings.MISSING_ARG, "callback"));
    }
    
    var self    = this,
        sync;
    
    function next(err, result, isSync) {
        if (result) {
            callback(err, result);
            
            if (isSync) {
                sync = true;
            } else {
                self.each(callback);
            }
        } else if (err) {
            callback(err);
        } else {
            callback(null, null);
        }
    }
        
    do {
        sync = false;
        this.nextObject(next);
    } while (sync);
};

/**
 * Gets the next object from the cursor.
 *
 * @param {Function} callback this will be called after executing this method. The first parameter will contain an error object on error while the second parameter will contain a object from the returned result or null if there are no more results.
 * @api public
 */
Cursor.prototype.nextObject = function (callback) {
    "use strict";
    
    if (!this.queryRun) {
        this.queryRun = true;
        this.state = Cursor.OPEN;
    }
    
    if (this.state === Cursor.CLOSED) {
        callback(new Error(Strings.CURSOR_CLOSED));
    } else {
        this._nextObject(function (err, item, isSync) {
            if (err) {
                this.state = Cursor.CLOSED;
            }
            
            callback(err, item, isSync);
        });
    }
};

Cursor.prototype._nextObject = function (callback) {
    "use strict";
    
    // abstract
    throw new Error(Strings.NOT_IMPLEMENTED);
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

module.exports = exports = Cursor;
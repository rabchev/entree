/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    Context     = require("./utils/context"),
    Err         = require("./utils/error"),
    _           = require("lodash"),
    uuid        = require("node-uuid");

function validateArgs(args, name) {
    var res = {};
    if (args.length === 1) {
        res.item = args[0];
    } else if (args.length === 2) {
        if (typeof args[1] === "function") {
            res.item = args[0];
            res.callback = args[1];
        } else {
            res.context = args[0];
            res.item = args[1];
        }
    } else if (args.length > 2) {
        res.context = args[0];
        res.item = args[1];
        res.callback = args[2];
    }

    if (!res.callback) {
        res.callback = function () {};
    }

    if (!res.item) {
        res.callback(new Err(Strings.MISSING_ARG, name));
        return null;
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

function validateSelectArgs(args) {
    var res = {},
        val;

    switch (args.length) {
    case 4:
        res.context = args[0];
        res.query = args[1];
        res.options = args[2];
        res.callback = args[3];
        break;
    case 3:
        if (args[0] instanceof Context) {
            res.context = args[0];
            res.query = args[1];
            if (_.isFunction(args[2])) {
                res.callback = args[2];
            } else {
                res.options = args[2];
            }
        } else {
            res.query = args[0];
            res.options = args[1];
            res.callback = args[2];
        }
        break;
    case 2:
        if (args[0] instanceof Context) {
            res.context = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.query = args[1];
            }
        } else {
            res.query = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.options = args[1];
            }
        }
        break;
    case 1:
        val = args[0];
        if (val instanceof Context) {
            res.context = val;
        } else if (typeof val === "function") {
            res.callback = val;
        } else {
            res.query = val;
        }
        break;
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

/**
 * Constructor for the data provider base class. This class cannot be used directly.
 *
 * Options
 *
 * - `connStr` {String} <required>, connection string.
 *
 * @class Represents a base class for storage specific data providers.
 * All provider implementations should derive from this class.
 *
 * In EntreeJS every data collection is an instance of Provider class.
 *
 * @param {object} opts - Additional options. The only required option is `connStr`.
 * @param {object=} schema - Defines the database schema such as fields, indexes, types and structure.
*/
function Provider(options, schema) {

    if (!options || !options.connStr || !_.isString(options.connStr)) {
        throw new Error(Strings.MISSING_PROV_ARGS);
    }

    this.options            = options;
    this.schema             = schema || {};
    this._stack             = [];
    this._uuid              = uuid.v1();
}

/**
 * This callback will be called after executing the method.
 * The first parameter will contain an error object if an error occurred during execution,
 * while the second parameter will contain the result from the execution if it was successful.
 *
 * For insert, upsert and update operations the result should be an object containing the same set of fields
 * that were originally passed plus any fields that were automatically updated, such as timestamps or identity fields.
 *
 * NOTE: the returned result on insert, update and delete may differ slightly for the different providers, but if no
 * error is returned the operation is considered successful.
 *
 * @callback Provider~actionCallback
 * @param {object} err - the error object upon unsuccessful execution.
 * @param {object} res - the result object upon successful execution.
 */

/**
 * Inserts new item in the data collecton.
 * If an item with the same identity is already present in the data collection,
 * the operation is aborted and an error is returned.
 *
 * @param {object=} context - Provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {(object|object[])} items - An item or an array of items to be inserted in the data store.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.insert = function () {
    var args = validateArgs(arguments, "items");
    if (args) {
        this._do("_insert", args.context, args.item, args.callback);
    }
};

/**
 * Inserts new item in the data collection if the item is not present, otherwise updates it.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {Object} item - the item to be added or updated.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.upsert = function () {
    var args = validateArgs(arguments, "item");
    if (args) {
        this._do("_upsert", args.context, args.item, args.callback);
    }
};

/**
 * Updates the specified item with the provided fields.
 * If an item with the specified identity could not be found an error is returned.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {Object} item - the item to be updated.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.update = function () {
    var args = validateArgs(arguments, "item");
    if (args) {
        this._do("_update", args.context, args.item, args.callback);
    }
};

/**
 * Removes the specified item from the data collection.
 * If an item with the specified identity is not found an error is returned.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {Object|String|Number} item|identity - the item or the identity of an item to be deleted.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.delete = function () {
    var args = validateArgs(arguments, "itemOrID");
    if (args) {
        this._do("_delete", args.context, args.item, args.callback);
    }
};

/**
 * Retrieves the specified item from the data collection.
 * If an item with the specified identity is not found an error is returned.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {(Object|String|Number)} item|identity - the item or the identity of an item to be retrieved.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.get = function () {
    var args = validateArgs(arguments, "itemOrID");
    if (args) {
        this._do("_get", args.context, args.item, args.callback);
    }
};

/**
 * Selects items in the data collection and returns a {@link Cursor} to the selected items.
 *
 * This method can return a Cursor either directly or with a callback. In most cases a cursor is created and returned synchronously, but some interceptors like {@link module:cache} require a callback. If you plan to use asynchronous interceptors you have to use the callback form.
 *
 * Select uses MongoDB query [syntax](http://docs.mongodb.org/manual/reference/operator/query). All Entree data providers should support the full specification.
 *
 * Options
 *
 *  - `skip` {Number}, the number of items to skip.
 *  - `limit` {Number}, limit the number of returned items.
 *  - `sort` {Object}, set to sort the documents coming back from the query.
 *
 * @example
 *
 *  // Select at most 10 teenagers starting from the 21th that matches the criteria:
 *  entree.users.select({ age: { $gte: 13,  $lte: 19 }})
 *      .skip(20)
 *      .limit(10)
 *      .sort({ age: 1 })
 *      .each(function (err, user)) {
 *          if (err) {
 *              return console.log(err);
 *          }
 *          console.log(JSON.stringify(user));
 *      });
 *
 *  // Do the same but with a callback - the recommended way if interceptors are used on the select method:
 *  entree.users.select({ age: { $gte: 13, $lte: 19 }}, function (err, cursor) {
 *      if (err) {
 *          return console.log(err);
 *      }
 *      cursor
 *          .skip(20)
 *          .limit(10)
 *          .sort({ age: 1 })
 *          .each(function (err, user) {
 *              if (err) {
 *                  return console.log(err);
 *              }
 *              console.log(JSON.stringify(user));
 *          });
 *  });
 *
 *  // Again the same but limitations set as options:
 *  entree.users.select({ age: { $gte: 13,  $lte: 19 }}, { skip: 20, limit: 10, sort: { age: 1 }}, function (err, cursor) {
 *      if (err) {
 *          return console.log(err);
 *      }
 *      cursor.each(function (err, user) {
 *          if (err) {
 *              return console.log(err);
 *          }
 *          onsole.log(JSON.stringify(user));
 *      });
 *  });
 *
 *  // Get the total number of all users in the collection:
 *  entree.users.select(function (err, currsor) {
 *      cursor.count(err, count) {
 *          if (err) {
 *              return console.log(err);
 *          }
 *          console.log(count);
 *      });
 *  });
 *
 * @param {object=} context - Provides context for the current execution.
 * @param {object=} query - Specifies selection criteria. To return all items in a collection, omit this parameter or pass an empty object.
 * @param {object=} options - Additional options for the cursor.
 * @param {function=} callback - Optional callback function that will be called when the {@link Cursor} is constructed.
 * @return {(null|Cursor)} - The method returns null if a callback is provided otherwise it returns a {@link Cursor}.
 */
Provider.prototype.select = function () {
    var args = validateSelectArgs(arguments);
    if (args) {
        return this._do("_select", args.context, { query: args.query, options: args.options }, args.callback);
    }
};

/**
 * This method is the same as `select`, but instead of cursor it returns the first item that
 * matches the select and sort criteria. If there is no match, null is returned.
 *
 * @param {object=} context - Provides context for the current execution.
 * @param {object=} query - Specifies selection criteria.
 * @param {object=} options - Additional options for the cursor.
 * @param {Provider~actionCallback} callback - The callback that handles the result of this action.
 * @return {null}
 */
Provider.prototype.selectOne = function (context, query, options, callback) {
    if (!callback) {
        if (options) {
            callback = options;
            options = null;
        } else if (query) {
            callback = query;
            query = null;
        } else if (context) {
            callback = context;
            context = null;
        }
    }
    if (!_.isFunction(callback)) {
        throw new Error(Strings.REQUIRED_CALLBACK);
    }
    this.select(context, query, options).first(callback);
};

/**
 * Adds an interception module to this provider instance.
 * See {@tutorial interceptors} tutorial for more details.
 *
 * @param {function} fn - The function that handles the interception.
 * @return {null}
 */
Provider.prototype.use = function (fn) {
    this._stack.push(fn);
};

/**
 * @protected
 */
Provider.prototype._getId = function (item) {
    if (typeof item === "object" && !(item instanceof Array)) {
        return item[this._getIdKey()] || (item.$set ? item.$set[this._getIdKey()] : undefined);
    } else {
        return item;
    }
};

/**
 * @protected
 */
Provider.prototype._setId = function (item, id) {
    if (typeof item === "object" && !(item instanceof Array)) {
        item[this._getIdKey()] = id;
    }
};

/**
 * @protected
 */
Provider.prototype._getIdKey = function () {
    return this.schema.__identifier__ || "_id";
};

/**
 * @protected
 */
Provider.prototype._do = function (action, context, item, callback) {
    var idx = 0,
        that = this;

    function next(itm, out) {
        var layer = that._stack[idx++];
        if (layer) {
            return layer.call(that, action, context, itm, next, out);
        }

        return that[action](itm, out);
    }

    return next(item, callback);
};

/**
 * This is utility method intended mainly for data provider implementers.
 *
 * @param {function} - Optional callback that will be called when the provider is initialized.
 * @return {null}
 */
Provider.prototype.init = function (callback) {
    // NOTE: Override if you need to initialize database connection.
    callback();
};

/**
 * Releases its database connection, clears current state and any cached data.
 *
 * This is utility method intended mainly for data provider implementers.
 *
 * @param {function} -  Optional callback that will be called when the provider is disposed.
 * @return {null}
 */
Provider.prototype.dispose = function (callback) {
    // NOTE: Override if you need to dispose database connection.
    callback();
};

/**
 * Creates new error object with the specified error message or error code.
 *
 * This is utility method intended mainly for data provider implementers.
 *
 * @param {(string|Error)} - This argument should be either error message, EntreeJS error code or error object.
 * @param {function=} - Error handler. If omitted the error will be thrown immediately.
 * @return {null}
 */
Provider.prototype.handleError = function (err, callback) {
    if (typeof err === "string") {
        err = new Err(err);
    }

    if (callback) {
        callback(err);
    } else {
        throw err;
    }
};

/**
 * @abstract
 */
Provider.prototype._insert = function (items, callback) {
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

/** @abstract */
Provider.prototype._upsert = function (item, callback) {
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

/**
 * @abstract
 */
Provider.prototype._update = function (item, callback) {
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._delete = function (item, callback) {
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

/**
 * @abstract
 */
Provider.prototype._get = function (item, callback) {
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

/**
 * @abstract
 */
Provider.prototype._select = function (args, callback) {
    throw new Error(Strings.NOT_IMPLEMENTED);
};

module.exports = Provider;

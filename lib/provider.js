/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    _           = require("lodash"),
    uuid        = require("node-uuid"),
    util        = require("util");

function Context(obj) {
    if (obj) {
        this.__orgObj = obj;
    } else if (obj === null) {
        this.__isEmpty = true;
    }
}

function validateArgs(args, name) {
    var res = {};
    if (args.length === 2) {
        res.item = args[0];
        res.callback = args[1];
    } else if (args.length > 2) {
        res.item = args[1];
        res.callback = args[2];
        res.context = args[0];
    }

    if (!res.item) {
        if (res.callback) {
            res.callback(new Error(util.format(Strings.MISSING_ARG, name)));
        } else {
            throw new Error(Strings.REQUIRED_CALLBACK);
        }
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
 * Schema
 *
 * - `__collName` {String} <rquiered>, the name of the data collection (table) for the provider.
 *
 * @class Represents a base class for storage specific providers.
 * All provider implementations should derive from this class.
 *
 * @param {Object} opts - additional options. The only required options is `connStr`.
 * @param {Object} schema - defines the database schema. The only required attribute is `__collName`.
*/
function Provider(options, schema) {

    if (!options || !options.connStr || !_.isString(options.connStr) || !schema || !schema.__collName || !_.isString(schema.__collName)) {
        throw new Error(Strings.MISSING_PROV_ARGS);
    }

    this.options            = options;
    this.schema             = schema;
    this._stack             = [];
    this._uuid              = uuid.v1();
}

Provider.prototype.createContext = function (context) {
    return new Context(context);
};

/**
 * This callback will be called after executing the method.
 * The first parameter will contain an error object if an error occurred during execution
 * while the second parameter will contain the result from the execution if it was successful.
 *
 * For insert, upsert and update operations the result should be an object containing the same set of fields
 * that were originally passed plus any fields that were automatically updated, such as timestamps or identity fields.
 *
 * NOTE: the returned result on insert, update and delete may differ slightly for the different providers, but if no
 * error is returned the operation is considered successful.
 *
 * @callback Provider~actionCallback
 * @param {Object} err - the error object upon unsuccessiful execution.
 * @param {Object} res - the result object upon successiful execution.
 */

/**
 * Inserts new item in the data store.
 * If an item with the same identity is already present in the data store,
 * the operation is aborted and an error is returned.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {Object} item - the item to be stored.
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
 * Inserts new item in the data store if the item is not present, otherwise updates it.
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
 * Removes the specified item from the data store.
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
 * Retrieves the specified item from the data store.
 * If an item with the specified identity is not found an error is returned.
 *
 * @param {Object=} context - provides context for the current execution.
 * Usually this is information about the user making the call.
 * Although this parameter is optional, it might be required by some interceptors, such as authorization.
 *
 * @param {(Object|String|Number)} item|identity - the item or the identity of an item to be deleted.
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
 * Selects items in the data store and returns a {@link Cursor} to the selected items.
 *
 * This method can return a Cursor either directly or with a callback. In most cases a cursor is created and returned synchronously, but some interceptors like {@link cache} require a callback. If you plan to use asynchronous interceptors you have to use the callback form.
 *
 * Options
 *
 *  - `skip` {Number}, skip number of documents to skip.
 *  - `limit` {Number}, limit the number of results to return.
 *  - `sort` {Object}, set to sort the documents coming back from the query.
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

Provider.prototype.use = function (fn) {
    this._stack.push(fn);
};

Provider.prototype._getId = function (item) {
    if (typeof item === "object" && !(item instanceof Array)) {
        return item[this._getIdKey()];
    } else {
        return item;
    }
};

Provider.prototype._setId = function (item, id) {
    if (typeof item === "object" && !(item instanceof Array)) {
        item[this._getIdKey()] = id;
    }
};

Provider.prototype._getIdKey = function () {
    return this.schema.identifier || "_id";
};

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

Provider.prototype.merge = function (src, trg) {
    if (src !== trg) {
        return _.defaults(src, trg);
    }
    return src;
};

Provider.prototype.init = function (callback) {
    // Override if you need to initialize database connection.
    callback();
};

Provider.prototype.dispose = function (callback) {
    // Override if you need to dispose database connection.
    callback();
};

Provider.prototype.handleError = function (err, callback) {
    if (typeof err === "string") {
        err = new Error(err);
    }

    if (callback) {
        callback(err);
    } else {
        throw err;
    }
};

Provider.prototype._insert = function (items, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._upsert = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._update = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._delete = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._get = function (item, callback) {
    // abstract
    callback(new Error(Strings.NOT_IMPLEMENTED));
};

Provider.prototype._select = function (args, callback) {
    // abstract
    throw new Error(Strings.NOT_IMPLEMENTED);
};

module.exports = Provider;

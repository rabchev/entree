/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    Err         = require("../utils/error"),
    MongoClient = require('mongodb').MongoClient,
    util        = require("util"),
    _           = require("lodash"),
    _conns      = {};

function getCollection(prov, callback) {
    var connStr     = prov.options.connStr,
        collName    = prov.schema.__collName,
        mdb         = _conns[connStr];

    if (mdb) {
        mdb.__prefs[prov._uuid] = true;
        callback(null, mdb.collection(collName));
    } else {
        MongoClient.connect(connStr, function (err, db) {
            if (err) {
                return callback(err);
            }
            _conns[connStr] = db;
            if (!db.__prefs) {
                db.__prefs = {};
            }
            db.__prefs[prov._uuid] = true;
            callback(null, db.collection(collName));
        });
    }
}

function removeReference(prov) {
    var db = _conns[prov.options.connStr];
    delete db.__prefs[prov._uuid];
    if (!_.keys(db.__prefs).length) {
        delete _conns[prov.options.connStr];
        db.close();
    }
}

// *** Cursor Implementation ***

function MongoCursor(provider, query, options) {
    Cursor.call(this, provider, query || {}, options || {});
}

util.inherits(MongoCursor, Cursor);

MongoCursor.prototype._getCursor = function (callback) {
    if (this._cursor) {
        return callback(this._cursor);
    }

    var opts = {};
    if (this.mapping) {
        if (_.isFunction(this.mapping)) {
            this._mapFunc = true;
        } else {
            opts.fields = this.mapping;
        }
    }
    if (this.criteria) {
        opts.sort = this.criteria;
    }
    if (this.limitValue !== 0) {
        opts.limit = this.limitValue;
    }
    if (this.skipValue !== 0) {
        opts.skip = this.skipValue;
    }
    this._cursor = this.provider.collection.find(this.query, opts);
    callback(this._cursor);
};

MongoCursor.prototype.reset = function () {
    this._getCursor(function (cursor) {
        cursor.rewind();
    });
    return this;
};

MongoCursor.prototype.limit = function (limit, callback) {
    var that = this;
    this.limitValue = limit;
    this._getCursor(function (cursor) {
        if (callback) {
            cursor.limit(limit, function (err) {
                callback(err, that);
            });
        } else {
            cursor.limit(limit);
        }
    });

    return that;
};

MongoCursor.prototype.skip = function (skip, callback) {
    var that = this;
    this.skipValue = skip;
    this._getCursor(function (cursor) {
        if (callback) {
            cursor.skip(skip, function (err) {
                callback(err, that);
            });
        } else {
            cursor.skip(skip);
        }
    });

    return that;
};

MongoCursor.prototype.sort = function (criteria, callback) {
    var that = this;
    this.criteria = criteria;
    this._getCursor(function (cursor) {
        if (callback) {
            cursor.sort(criteria, function (err) {
                callback(err, that);
            });
        } else {
            cursor.sort(criteria);
        }
    });

    return that;
};

MongoCursor.prototype.map = function (mapping, callback) {
    this.mapping = mapping;

    if (_.isFunction(mapping)) {
        this._mapFunc = true;
        if (callback) {
            callback(null, this);
        }
        return this;
    }

    var fields = {},
        i,
        l;

    if (_.isArray(mapping)) {
        if (!mapping.length) {
            fields._id = 1;
        } else {
            for (i = 0, l = mapping.length; i < l; i++) {
                fields[mapping[i]] = 1;
            }
        }
    }

    this._getCursor(function (cursor) {
        cursor.fields = fields;
        if (callback) {
            callback(null, this);
        }
    });

    return this;
};

MongoCursor.prototype.toArray = function (callback) {
    var arr = [];
    this.each(function (err, item) {
        if (err) {
            return callback(err);
        }

        if (item) {
            arr.push(item);
        } else {
            callback(null, arr);
        }
    });
};

MongoCursor.prototype.each = function (callback) {
    var that = this;
    this._getCursor(function (cursor) {
        cursor.each(function (err, item) {
            if (err) {
                return callback(err);
            }
            that._nextObject(callback, item);
        });
    });
};

MongoCursor.prototype.next = function (callback) {
    var that = this;
    this._getCursor(function (cursor) {
        cursor.nextObject(function (err, item) {
            if (err) {
                return callback(err);
            }
            that._nextObject(callback, item);
        });
    });
};

MongoCursor.prototype.count = function (callback) {
    this._getCursor(function (cursor) {
        cursor.count(false, callback);
    });
};

MongoCursor.prototype.update = function (data, callback) {
    var opts    = {
        w       : this.provider.options.safeMode,
        multi   : true
    },
        select  = this.query;

    this.provider.collection.update(select, data, opts, callback);
};

MongoCursor.prototype.delete = function (callback) {
    var opts    = {
        w       : this.provider.options.safeMode,
        single  : false
    },
        select  = this.query;

    this.provider.collection.remove(select, opts, callback);
};

MongoCursor.prototype._nextObject = function (callback, item) {
    callback(null, this._map(item));
};

MongoCursor.prototype._map = function (item) {
    if (item && this._mapFunc) {
        return this.mapping(item);
    }
    return item;
};

// *** Provider Implementation ***

/**
 * Constructor for MongoDB provider. This class inherits from {@link Provider}.
 *
 * This provider is a thin wrapper around the native MongoDB [driver]( https://github.com/mongodb/node-mongodb-native) for NodeJS.
 * Each provider instance represents a MongoDB [collection]( http://docs.mongodb.org/manual/reference/glossary/#term-collection).
 *
 * For usage reference, please refer to [Provider documentation]{@link Provider}.
 *
 * Options
 *
 * - `connStr` {String} <required> The [connection string](http://docs.mongodb.org/manual/reference/connection-string) to MongoDB instance.
 *
 * @class Represents a provider for MongoDB storage.
 * @param {object} opts - Additional options. The only required option is `connStr`.
 * @param {object=} schema - Defines the fields of the collection represented by the provider instance.
*/
function MongoProvider(opts, schema) {

    if (!opts.insert) {
        opts.insert = {
            continueOnError: true
        };
    }

    if (!opts.update) {
        opts.update = {
            w: 1
        };
    }

    if (!opts.upsert) {
        opts.upsert = {
            w: 1
        };
    }
    opts.upsert.upsert = true;

    if (!opts.delete) {
        opts.delete = {
            w: 1
        };
    }

    Provider.call(this, opts, schema);
}

util.inherits(MongoProvider, Provider);

MongoProvider.prototype.init = function (callback) {
    var that = this;
    getCollection(this, function (err, coll) {
        if (!err) {
            that.collection = coll;
        }
        callback(err);
    });
};

MongoProvider.prototype.dispose = function (callback) {
    removeReference(this);
    callback();
};

MongoProvider.prototype._insert = function (items, callback) {
    this.collection.insert(items, this.options.insert, function (err, result) {
        var res;
        if (_.isArray(items)) {
            res = result;
        } else if (result && result.length === 1) {
            res = result[0];
        }
        if (err && err.message.indexOf("must not start with '$'") !== -1) {
            err = new Err("OPERS_NOT_ALLOWED");
        }
        callback(err, res);
    });
};

MongoProvider.prototype._update = function (item, callback) {
    var select  = {_id: this._getId(item)};

    this.collection.update(select, item, this.options.update, callback);
};

MongoProvider.prototype._upsert = function (item, callback) {
    var select  = {_id: this._getId(item)};

    this.collection.update(select, item, this.options.upsert, callback);
};

MongoProvider.prototype._delete = function (item, callback) {
    var opts    = {
        w       : this.options.safeMode,
        single  : true
    },
        select  = {_id: this._getId(item)};

    this.collection.remove(select, opts, callback);
};

MongoProvider.prototype._get = function (item, callback) {
    var select  = {_id: this._getId(item)},
        that    = this;

    this.collection.findOne(select, function (err, result) {
        if (!err && !result) {
            return that.handleError("ITEM_DOESNOT_EXIST", callback);
        }
        callback(err, result);
    });
};

MongoProvider.prototype._select = function (args, callback) {
    var cursor = new MongoCursor(this, args.query, args.options);
    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = MongoProvider;

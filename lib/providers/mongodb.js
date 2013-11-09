/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    MongoClient = require('mongodb').MongoClient,
    util        = require("util"),
    uuid        = require("node-uuid"),
    _           = require("lodash"),
    _conns      = {};

function getCollection(prov, callback) {
    var connStr     = prov.connectionString,
        collName    = prov.options.typeName,
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
    var db = _conns[prov.connectionString];
    delete db.__prefs[prov._uuid];
    if (!_.keys(db.__prefs).length) {
        delete _conns[prov.connectionString];
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

    var that = this;
    that.provider._init(function (err, coll) {
        if (err) {
            throw err;
        }

        var opts = {};
        if (that.mapping) {
            if (_.isFunction(that.mapping)) {
                this._mapFunc = true;
            } else {
                opts.fields = that.mapping;
            }
        }
        if (that.criteria) {
            opts.sort = that.criteria;
        }
        if (that.limitValue !== 0) {
            opts.limit = that.limitValue;
        }
        if (that.skipValue !== 0) {
            opts.skip = that.skipValue;
        }
        that._cursor = coll.find(that.query, opts);
        callback(that._cursor);
    });
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

    this.provider._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.update(select, { $set: data }, opts, callback);
    });
};

MongoCursor.prototype.delete = function (callback) {
    var opts    = {
        w       : this.provider.options.safeMode,
        single  : false
    },
        select  = this.query;

    this.provider._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.remove(select, opts, callback);
    });
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

function MongoProvider(connStr, options) {
    if (!connStr || !_.isString(connStr)) {
        throw new Error(Strings.MISSING_CONN_STR);
    }

    this._uuid = uuid.v1();

    if (!options.safeMode) {
        options.safeMode = 1;
    }

    Provider.call(this, connStr, options);
}

util.inherits(MongoProvider, Provider);

MongoProvider.prototype._init = function (callback) {
    if (this.collection) {
        return callback(null, this.collection);
    }
    var that = this;
    getCollection(this, function (err, coll) {
        if (!err) {
            that.collection = coll;
        }
        callback(err, coll);
    });
};

MongoProvider.prototype.dispose = function () {
    removeReference(this);
};

MongoProvider.prototype._insert = function (items, callback) {
    var opts = {w: this.options.safeMode};

    this._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.insert(items, opts, function (err, result) {
            var res;
            if (_.isArray(items)) {
                res = result;
            } else if (result && result.length === 1) {
                res = result[0];
            }

            callback(err, res);
        });
    });
};

MongoProvider.prototype._update = function (item, callback, upsert) {
    var opts    = {w: this.options.safeMode},
        select  = {_id: this._getId(item)};

    if (upsert) {
        opts.upsert = true;
    }

    this._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.update(select, item, opts, callback);
    });
};

MongoProvider.prototype._upsert = function (item, callback) {
    this._update(item, callback, true);
};

MongoProvider.prototype._delete = function (item, callback) {
    var opts    = {
        w       : this.options.safeMode,
        single  : true
    },
        select  = {_id: this._getId(item)};

    this._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.remove(select, opts, callback);
    });
};

MongoProvider.prototype._get = function (item, callback) {
    var select  = {_id: this._getId(item)};

    this._init(function (err, coll) {
        if (err) {
            return callback(err);
        }

        coll.findOne(select, function (err, result) {
            if (!err && !result) {
                err = new Error(Strings.ITEM_DOESNOT_EXIST);
            }
            callback(err, result);
        });
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

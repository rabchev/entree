/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    CollErr     = require("../utils/collective-error"),
    Err         = require("../utils/error"),
    object      = require("../utils/object"),
    util        = require("util"),
    sift        = require("sift"),
    path        = require("path"),
    uuid        = require("node-uuid"),
    fs          = require("fs"),
    async       = require("async"),
    _           = require("lodash");

function FsCursor(provider, query, options) {
    this._files = null;
    if (query) {
        this.sifter = sift(query);
    }

    Cursor.call(this, provider, query, options);
    this.reset();
}

util.inherits(FsCursor, Cursor);

FsCursor.prototype.reset = function () {
    this.current = this.skipValue;
    if (this.current !== 0 && this.limitValue !== 0) {
        this.limitValue += this.current;
    }

    if (this.mapping && !_.isArray(this.mapping)) {
        if (_.isObject(this.mapping)) {
            this.mapping = _.keys(this.mapping);
        } else if (_.isString(this.mapping)) {
            this.mapping = [this.mapping];
        } else if (!_.isFunction(this.mapping)) {
            throw new Err("UNSUP_MAP_TYPE");
        }
    }

    return this;
};

FsCursor.prototype._isMatch = function (item) {
    if (this.sifter) {
        return this.sifter.test(item);
    }
    return true;
};

FsCursor.prototype._map = function (item) {
    if (item && this.mapping) {
        if (_.isFunction(this.mapping)) {
            return this.mapping(item);
        }
        return _.pick.apply(null, [item].concat(this.mapping));
    }
    return item;
};

FsCursor.prototype._nextObject = function (callback) {
    var self = this;

    function nextItem() {
        var item, file;
        if (self.limitValue === 0 || self.current < self.limitValue) {
            file = self._files[self.current++];
            while (file) {
                item = require(path.join(self.provider.dir, file));
                if (self._isMatch(item)) {
                    break;
                }
                item = null;
                file = self._files[self.current++];
            }
        }
        callback(null, self._map(item));
    }

    if (!self._files) {
        fs.readdir(self.provider.dir, function (err, files) {
            if (err) {
                return callback(err);
            }
            self._files = files;
            nextItem();
        });
    } else {
        nextItem();
    }
};

FsCursor.prototype.count = function (callback) {
    var that = this;
    that.exec(function (err) {
        if (err) {
            callback(err);
        } else {
            if (that.items) {
                callback(null, that.items.length);
            } else {
                if (that.query) {
                    that.toArray(function (err, list) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(err, list.length);
                    });
                } else {
                    fs.readdir(that.provider.dir, function (err, files) {
                        if (err) {
                            return callback(err);
                        }
                        that._files = files;
                        callback(null, that._files.length);
                    });
                }
            }
        }
    });

    return this;
};

FsCursor.prototype._exec = function (callback) {
    var that = this;
    if (this.criteria) {
        this.toArray(function (err, list) {
            if (!err) {
                if (_.isFunction(that.criteria)) {
                    list.sort(that.criteria);
                } else {
                    list.sort(function (a, b) {
                        return that.comparer(a, b);
                    });
                }
                that.items = list;
            }
            return callback(err);
        });
    } else {
        callback();
    }
};

/**
 * Constructor for the file system provider. This class inherits from {@link Provider}.
 *
 * Each data collection in EntreeJS represents a data provider instance.
 * A sub directory will be created for every data collection using this provider.
 * The directories will be placed in the data root specified in the options `connStr` argument and
 * will have the same names as their corresponding collection names.
 *
 * For usage reference, please refer to [Provider documentation]{@link Provider}.
 *
 * Options
 *
 * - `connStr` {String} <required> Specifies the root directory relative to `process.cwd()`. **Example:** `./data`
 *
 * @class Represents a provider for local file system storage.
 * @param {object} opts - Additional options. The only required option is `connStr`.
 * @param {object=} schema - Defines the fields of the collection represented by the provider instance.
*/
function FsProvider(opts, schema) {
    Provider.call(this, opts, schema);

    var orgCwd,
        connStr = path.resolve(process.cwd(), opts.connStr);

    this.dir = path.join(connStr, schema.__collName);
    if (!fs.existsSync(this.dir)) {
        orgCwd = process.cwd();
        process.chdir(connStr);
        fs.mkdirSync(schema.__collName);
        process.chdir(orgCwd);
    }
}

util.inherits(FsProvider, Provider);

FsProvider.prototype._insert = function (items, callback) {
    var that = this,
        error = new CollErr(),
        i;

    function storeItem(item, cb) {
        var id  = that._getId(item),
            filePath;

        if (!id) {
            id = uuid.v1();
            that._setId(item, id);
        }

        filePath = path.join(that.dir, id + ".json");
        fs.exists(filePath, function (exists) {
            if (exists) {
                error.push("ITEM_EXISTS");
                return cb();
            }

            fs.writeFile(filePath, JSON.stringify(item), function (err) {
                if (err) {
                    error.push(err);
                }
                cb();
            });
        });
    }

    function completeRequest(err) {
        if (err) {
            error.push(err);
        }
        if (error.errors.length > 0) {
            that.handleError(error, callback);
        } else {
            callback(null, items);
        }
    }

    if (_.isArray(items)) {
        for (i = 0; i < items.length; i++) {
            if (object.validateKeys(items[i]) !== "fields") {
                return that.handleError("OPERS_NOT_ALLOWED", callback);
            }
        }
        async.each(items, storeItem, completeRequest);
    } else {
        if (object.validateKeys(items) !== "fields") {
            return that.handleError("OPERS_NOT_ALLOWED", callback);
        }
        storeItem(items, completeRequest);
    }
};

FsProvider.prototype._upsert = function (item, callback) {
    var that        = this,
        id          = that._getId(item),
        filePath;

    if (!id) {
        return that._insert(item, callback);
    }

    filePath = path.join(this.dir, id + ".json");
    fs.exists(filePath, function (exists) {
        if (exists) {
            that._update(item, callback);
        } else {
            that._insert(item.$set || item, callback);
        }
    });
};

FsProvider.prototype._update = function (item, callback) {
    var that = this;

    that._get(item, function (err, res) {
        if (err) {
            return that.handleError(err, callback);
        }
        var id          = that._getId(item),
            idKey       = that._getIdKey(),
            filePath    = path.join(that.dir, id + ".json");

        delete item[idKey];
        try {
            item = object.update(item, res);
        } catch (err) {
            that.handleError(err, callback);
        }

        item[idKey] = id;
        fs.writeFile(filePath, JSON.stringify(item), function (err) {
            if (err) {
                that.handleError(err, callback);
            } else {
                callback(null, item);
            }
        });
    });
};

FsProvider.prototype._get = function (item, callback) {
    var that        = this,
        id          = that._getId(item),
        filePath;

    if (!id) {
        return that.handleError("MISSING_ID", callback);
    }

    filePath = path.join(this.dir, id + ".json");
    fs.readFile(filePath, { encoding: "utf8" }, function (err, data) {
        if (err) {
            if (err.code === "ENOENT") {
                that.handleError("ITEM_DOESNOT_EXIST", callback);
            } else {
                that.handleError(err, callback);
            }
        } else {
            callback(null, JSON.parse(data));
        }
    });
};

FsProvider.prototype._delete = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    if (!id) {
        return this.handleError("MISSING_ID", callback);
    }

    var filePath = path.join(this.dir, id + ".json");
    fs.unlink(filePath, function (err) {
        if (err) {
            if (err.code === "ENOENT") {
                that.handleError("ITEM_DOESNOT_EXIST", callback);
            } else {
                that.handleError(err, callback);
            }
        } else {
            callback(null, item);
        }
    });
};

FsProvider.prototype._select = function (args, callback) {
    var cursor = new FsCursor(this, args.query, args.options);
    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = FsProvider;

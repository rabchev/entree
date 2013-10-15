/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    util        = require("util"),
    sift        = require("sift"),
    path        = require("path"),
    uuid        = require('node-uuid'),
    fs          = require("fs"),
    _           = require("underscore");

function CursorImpl(provider, query, options) {
    if (query) {
        this.sifter = sift(query);
    }

    Cursor.call(this, provider, query, options);
}

util.inherits(CursorImpl, Cursor);

CursorImpl.prototype.reset = function () {
    this.current = this.skipValue;
    if (this.current !== 0 && this.limitValue !== 0) {
        this.limitValue += this.current;
    }

    this._files = null;

    if (this.mapping && !_.isArray(this.mapping)) {
        if (_.isObject(this.mapping)) {
            this.mapping = _.keys(this.mapping);
        } else if (_.isString(this.mapping)) {
            this.mapping = [this.mapping];
        } else if (!_.isFunction(this.mapping)) {
            throw new Error("Unsuported mapping type.");
        }
    }
};

CursorImpl.prototype._isMatch = function (item) {

    if (this.sifter) {
        return this.sifter.test(item);
    }
    return true;
};

CursorImpl.prototype._map = function (item) {
    if (item && this.mapping) {
        if (_.isFunction(this.mapping)) {
            return this.mapping(item);
        }
        return _.pick.apply(null, [item].concat(this.mapping));
    }
    return item;
};

CursorImpl.prototype._nextObject = function (callback) {
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
                file = self._files[self.current++];
            }
        }
        callback(null, self._map(item), false);
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

CursorImpl.prototype.count = function (callback) {
    var that = this;
    that.exec(function (err) {
        if (err) {
            callback(err);
        } else {
            if (that.items) {
                callback(null, that.items.length);
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
    });
};

CursorImpl.prototype._exec = function (callback) {
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

function ProviderImpl(connStr, options) {
    var orgCwd;

    if (options && options.typeName) {
        this.dir = path.join(connStr, options.typeName);
    } else {
        this.dir = connStr;
    }

    if (!fs.existsSync(this.dir)) {
        orgCwd = process.cwd();
        process.chdir(connStr);
        fs.mkdirSync(options.typeName);
        process.chdir(orgCwd);
    }

    Provider.call(this, connStr, options);
}

util.inherits(ProviderImpl, Provider);

ProviderImpl.prototype._insert = function (item, callback) {
    var that        = this,
        id          = that._getId(item),
        filePath;

    if (!id) {
        id = uuid.v1();
        that._setId(item, id);
    }

    filePath = path.join(this.dir, id + ".json");
    fs.exists(filePath, function (exists) {
        if (exists) {
            that.handleError(Strings.ITEM_EXISTS, callback);
        } else {
            fs.writeFile(filePath, JSON.stringify(item), function (err) {
                if (err) {
                    that.handleError(err, callback);
                } else {
                    callback(null, item);
                }
            });
        }
    });
};

ProviderImpl.prototype._upsert = function (item, callback) {
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
            that._insert(item, callback);
        }
    });
};

ProviderImpl.prototype._update = function (item, callback) {
    var that = this;

    that._get(item, function (err, res) {
        if (err) {
            return that.handleError(err, callback);
        }

        var mrg         = that.merge(item, res),
            id          = that._getId(mrg),
            filePath    = path.join(that.dir, id + ".json");

        fs.writeFile(filePath, JSON.stringify(mrg), function (err) {
            if (err) {
                that.handleError(err, callback);
            } else {
                callback(null, mrg);
            }
        });
    });
};

ProviderImpl.prototype._get = function (item, callback) {
    var that        = this,
        id          = that._getId(item),
        filePath;

    if (!id) {
        return that.handleError(Strings.MISSING_ID, callback);
    }

    filePath = path.join(this.dir, id + ".json");
    fs.readFile(filePath, { encoding: "utf8" }, function (err, data) {
        if (err) {
            if (err.code === "ENOENT") {
                that.handleError(Strings.ITEM_DOESNOT_EXIST, callback);
            } else {
                that.handleError(err, callback);
            }
        } else {
            callback(null, JSON.parse(data));
        }
    });
};

ProviderImpl.prototype._delete = function (item, callback) {
    var that    = this,
        id      = that._getId(item);

    if (!id) {
        return this.handleError(Strings.MISSING_ID, callback);
    }

    var filePath = path.join(this.dir, id + ".json");
    fs.unlink(filePath, function (err) {
        if (err) {
            if (err.code === "ENOENT") {
                that.handleError(Strings.ITEM_DOESNOT_EXIST, callback);
            } else {
                that.handleError(err, callback);
            }
        } else {
            callback(null, item);
        }
    });
};

ProviderImpl.prototype._select = function (args, callback) {
    var cursor = new CursorImpl(this, args.query, args.options);
    if (callback) {
        callback(null, cursor);
    } else {
        return cursor;
    }
};

module.exports = ProviderImpl;

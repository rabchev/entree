/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    util        = require("util"),
    sift        = require("sift"),
    path        = require("path"),
    uuid        = require('node-uuid'),
    fs          = require("fs"),
    _           = require("underscore"),
    empty       = "";

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
    
    this.items = null;
    
    if (this.projection && !_.isArray(this.projection)) {
        if (_.isObject(this.projection)) {
            this.projection = _.keys(this.projection);
        } else if (_.isString(this.projection)) {
            this.projection = [this.projection];
        } else {
            throw new Error("Unsuported arument type.");
        }
    }
};

CursorImpl.prototype._isMatch = function (item) {
    
    if (this.sifter) {
        return this.sifter.test(item);
    }
    return true;
};

CursorImpl.prototype._project = function (item) {
    return _.pick.apply(null, [item].concat(this.projection));
};

CursorImpl.prototype._nextObject = function (callback) {
    var self = this;
    
    function nextItem() {
        var item, file;
        if (self.limitValue === 0 || self.current < self.limitValue) {
            file = self.items[self.current++];
            while (file) {
                item = require(path.join(self.provider.dir, file));
                if (self._isMatch(item)) {
                    break;
                }
                file = self.items[self.current++];
            }
            
            if (item && self.projection) {
                item = self._project(item);
            }
        }
        callback(null, item, false);
    }
    
    if (!this.items) {
        fs.readdir(this.provider.dir, function (err, files) {
            if (err) {
                throw err;
            }
            this.items = files;
            nextItem();
        });
    } else {
        nextItem();
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

module.exports = ProviderImpl;
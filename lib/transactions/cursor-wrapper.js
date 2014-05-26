"use strict";

function CursorWrapper(query, options, persisted) {
    if (persisted) {
        this.query = persisted.query;
        this.options = persisted.options;
        this.method = persisted.method;
        this.data = persisted.data;
    } else {
        this.query = query;
        this.options = options || {};
        this.method = null;
        this.data = null;
    }
}

CursorWrapper.prototype.limit = function (limit, callback) {
    this.options.limit = limit;
    if (callback) {
        return callback(null, this);
    }
    return this;
};

CursorWrapper.prototype.take = function (take, callback) {
    this.options.limit = take;
    if (callback) {
        return callback(null, this);
    }
    return this;
};

CursorWrapper.prototype.skip = function (skip, callback) {
    this.options.skip = skip;
    if (callback) {
        return callback(null, this);
    }
    return this;
};

CursorWrapper.prototype.sort = function (criteria, callback) {
    this.options.sort = criteria;
    if (callback) {
        return callback(null, this);
    }
    return this;
};

CursorWrapper.prototype.map = function (mapping, callback) {
    this.options.map = mapping;
    if (callback) {
        return callback(null, this);
    }
    return this;
};

CursorWrapper.prototype.update = function (data) {
    this.method = "update";
    this.data = data;
};

CursorWrapper.prototype.delete = function () {
    this.method = "delete";
};

CursorWrapper.prototype.toString = function () {
    return JSON.stringify(this);
};

module.exports = CursorWrapper;

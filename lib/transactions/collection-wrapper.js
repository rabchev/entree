"use strict";

var CursorWrapper = require("./cursor-wrapper");

function CollectionWrapper(name, methods) {
    this.name = name;
    this.methods = methods || [];
    this.methods.forEach(function (el) {
        if (el.cursor && !(el.cursor instanceof CursorWrapper)) {
            el.cursor = new CursorWrapper(null, null, el.cursor);
        }
    });
}

CollectionWrapper.prototype.insert = function (data) {
    this.methods.push({
        name: "insert",
        data: data
    });
};

CollectionWrapper.prototype.upsert = function (data) {
    this.methods.push({
        name: "upsert",
        data: data
    });
};

CollectionWrapper.prototype.update = function (data) {
    this.methods.push({
        name: "update",
        data: data
    });
};

CollectionWrapper.prototype.delete = function (data) {
    this.methods.push({
        name: "delete",
        data: data
    });
};

CollectionWrapper.prototype.select = function (query, options, callback) {
    var cursor = new CursorWrapper(query, options);
    this.methods.push({
        name: "select",
        cursor: cursor
    });
    if (callback) {
        return callback(null, cursor);
    }
    return cursor;
};

CollectionWrapper.prototype.toString = function () {
    return JSON.stringify(this);
};

module.exports = CollectionWrapper;

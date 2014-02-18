/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var CursorWrapper = require("./curso-wrapper");

function CollectionWrapper(name) {
    this.name = name;
    this.methods = [];
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

module.exports = CollectionWrapper;

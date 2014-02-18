/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var uuid        = require("node-uuid"),
    Wrapper     = require("./collection-wrapper");

function Transaction(manager, transId, collections, persisted) {
    var that = this,
        wrapper;

    this.id = transId || uuid.v1();
    this.manager = manager;
    this.collections = [];

    if (!collections) {
        collections = manager.collections;
    }

    if (persisted) {

    }

    collections.forEach(function (el) {
        if (!that[el.name]) {
            wrapper = new Wrapper(el);
            that.collections.push(wrapper);
            that[el.name] = wrapper;
        }
    });
}

Transaction.prototype.getPersistent = function () {
    return {
        _id: this.id,
        collections: this.collections
    };
};

Transaction.prototype.toString = function () {
    return JSON.stringify(this.getPersistent());
};

module.exports = Transaction;

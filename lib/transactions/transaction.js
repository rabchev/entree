/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var async       = require("async"),
    uuid        = require("node-uuid"),
    Err         = require("../utils/error"),
    Wrapper     = require("./collection-wrapper");

function Transaction(transMan, transId, collections, persisted) {
    var that = this,
        wrapper;

    this.id = transId || uuid.v1();
    this.transMan = transMan;
    this.manager = transMan.manager;
    this.collections = [];
    this.state = "initial";

    if (!collections) {
        collections = this.manager.collections;
    }

    if (persisted && persisted.collections) {
        persisted.collections.forEach(function (el) {
            if (this.manager[el.name]) {
                wrapper = new Wrapper(el.name, el.methods);
                that.collections.push(wrapper);
                that[el.name] = wrapper;
            }
        });
    }

    collections.forEach(function (el) {
        if (!that[el.name]) {
            wrapper = new Wrapper(el);
            that.collections.push(wrapper);
            that[el.name] = wrapper;
        }
    });
}

Transaction.prototype.commit = function (callback) {
    this.state = "pending";
    this.transMan.store.upsert(this.toPersistent(), function (err, res) {
        if (err) {
            return callback(err);
        }

    });
};

Transaction.prototype.save = function (callback) {
    var err;

    if (this.status !== "initial") {
        err = new Err("TRANS_NOT_INITIAL");
        if (callback) {
            return callback(err);
        }
        throw err;
    }

    this.transMan.store.upsert(this.toPersistent(), callback);
};

Transaction.prototype.cancel = function (callback) {
    this.state = "canceled";
    this.transMan.cancel(this.id, callback);
};

Transaction.prototype.toPersistent = function () {
    var obj = {
        _id: this.id,
        collections: []
    };

    this.collections.forEach(function (el) {
        if (el.methods.length > 0) {
            obj.collections.push(el);
        }
    });

    return obj;
};

Transaction.prototype.toString = function () {
    return JSON.stringify(this.getPersistent());
};

module.exports = Transaction;

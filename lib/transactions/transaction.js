/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var async       = require("async"),
    uuid        = require("node-uuid"),
    Err         = require("../utils/error"),
    Wrapper     = require("./collection-wrapper");

function readOldData(trans, context) {
    var fns = [];

    trans.collections.forEach(function (coll) {
        coll.methods.forEach(function (method) {
            fns.push(function (cb) {
                if (method.name === "select") {
                    var cur = method.cursor;
                    trans.dataManager[coll.name]
                        .select(context, cur.query, cur.options, function (err, cursor) {
                            if (err) {
                                return cb(err);
                            }
                            cursor.toArray(function (err, res) {
                                if (!err) {
                                    cur.oldData = res;
                                }
                                cb(err, res);
                            });
                        });
                } else {
                    trans.dataManager[coll.name].get(context, method.data, function (err, res) {
                        if (!err) {
                            method.oldData = res;
                        }
                        cb(err, res);
                    });
                }
            });
        });
    });

    return fns;
}

function getCommits(trans, context) {
    var fns = [];

    trans.collections.forEach(function (coll) {
        coll.methods.forEach(function (method) {
            fns.push(function (cb) {
                if (method.name === "select") {
                    var cur = method.cursor;
                    trans.dataManager[coll.name]
                        .select(context, cur.query, cur.options, function (err, cursor) {
                            if (cur.data) {
                                cursor[cur.method](cur.data, cb);
                            } else {
                                cursor[cur.method](cb);
                            }
                        });
                } else {
                    trans.dataManager[coll.name][method.name](context, method.data, cb);
                }
            });
        });
    });

    return fns;
}

function Transaction(transMan, transId, collections, persisted) {
    var that = this,
        wrapper;

    // FIXME: collections canbe be string array or porviders. Strings are not handled at all.

    this.id = transId || uuid.v1();
    this.transMan = transMan;
    this.dataManager = transMan.dataManager;
    this.collections = [];
    this.state = "initial";

    if (!collections) {
        collections = this.dataManager.collections;
    }

    if (persisted && persisted.collections) {
        persisted.collections.forEach(function (el) {
            if (this.dataManager[el.name]) {
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

Transaction.prototype.commit = function (context, callback) {
    var readFns = getCommits(this, context),
        that    = this;

    async.parallel(readFns, function (err) {
        if (err) {
            return callback(err);
        }
        that.state = "pending";
        that.transMan.store.upsert(that.toPersistent(), function (err, res) {
            if (err) {
                return callback(err);
            }
            var commFns = getCommits(that, context);
            async.series(commFns, function (err, res) {
                if (err) {
                    // Rolleback
                } else {
                    that.transMan.delete(that.id);
                }
                callback(err, res);
            });
        });
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
        status: this.status,
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

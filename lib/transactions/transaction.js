/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var async       = require("async"),
    uuid        = require("node-uuid"),
    Err         = require("../utils/error"),
    CollErr     = require("../utils/collective-error"),
    Wrapper     = require("./collection-wrapper");

function readOldData(trans, context) {
    var fns = [];

    trans.collections.forEach(function (coll) {
        coll.methods.forEach(function (method) {
            if (method.name === "insert") {
                return;
            }
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

                function responseHandler (err, res) {
                    if (err) {
                        cb(err);
                    }
                    method.success = true;
                    trans.transMan.store.update(trans.toPersistent(), function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, res);
                    });
                }

                if (method.name === "select") {
                    var cur = method.cursor;
                    trans.dataManager[coll.name]
                        .select(context, cur.query, cur.options, function (err, cursor) {
                            if (cur.data) {
                                cursor[cur.method](cur.data, responseHandler);
                            } else {
                                cursor[cur.method](responseHandler);
                            }
                        });
                } else {
                    trans.dataManager[coll.name][method.name](context, method.data, responseHandler);
                }
            });
        });
    });

    return fns;
}

function restore(coll, method, context, id, data, cb) {
    switch (method) {
    case "insert":
        coll.delete(context, id, cb);
        break;
    case "upsert":
        if (data) {
            coll.update(context, data, cb);
        } else {
            coll.delete(context, id, cb);
        }
        break;
    case "update":
        coll.update(context, data, cb);
        break;
    case "delete":
        coll.insert(context, data, cb);
        break;
    default:
        cb(new Error("Unknown method."));
        break;
    }
}

function getRollbacks(trans, context) {
    var fns = [];

    trans.collections.forEach(function (coll) {
        var collName = coll.name;
        coll.methods.forEach(function (method) {
            if (method.success) {
                fns.push(function (cb) {
                    var coll = trans.dataManager[collName],
                        curFns;

                    if (method.name === "select") {
                        curFns = [];
                        method.cursor.oldData.forEach(function (el) {
                            curFns.push(function (cb) {
                                restore(coll, method.cursor.method, context, null, el, cb);
                            });
                        });
                        async.parallel(curFns, cb);
                    } else {
                        restore(coll, method.name, context, coll._getId(method.data), method.oldData, cb);
                    }
                });
            }
        });
    });

    return fns;
}

function Transaction(transMan, transId, collections, persisted) {
    var that = this,
        wrapper;

    // FIXME: [x] Collections canbe be string array or porviders. Strings are not handled at all.

    this.id = transId || uuid.v1();
    this.transMan = transMan;
    this.dataManager = transMan.dataManager;
    this.collections = [];
    this.state = "initial";

    if (persisted && persisted.collections) {
        persisted.collections.forEach(function (el) {
            if (this.dataManager[el.name]) {
                wrapper = new Wrapper(el.name, el.methods);
                that.collections.push(wrapper);
                that[el.name] = wrapper;
            }
        });
    }

    if (!collections) {
        collections = this.dataManager.collections;
    }

    collections.forEach(function (el) {
        if (typeof el === "string") {
            el = that.dataManager[el];
            if (!el) {
                throw new Err("NO_SUCH_PROVIDER", [el.name]);
            }
        }

        if (!that[el.name]) {
            wrapper = new Wrapper(el.name);
            that.collections.push(wrapper);
            that[el.name] = wrapper;
        }
    });
}

Transaction.prototype.rollback = function (context, callback, commitErr) {
    var that = this;

    this.state = "canceling";
    this.transMan.store.update(this.toPersistent(), function (err) {
        if (err) {
            if (commitErr) {
                err = new CollErr(err);
                err.push(commitErr);
            }
            return callback(err);
        }

        var rbFns = getRollbacks(that, context);
        async.parallel(rbFns, function (err, res) {
            if (err) {
                if (commitErr) {
                    err = new CollErr(err);
                    err.push(commitErr);
                }
                return callback(err);
            }
            that.state = "canceled";
            that.transMan.store.delete(that.id);
            callback(commitErr, res);
        });
    });
};

Transaction.prototype.commit = function (context, callback) {
    if (typeof context === "function") {
        callback = context;
        context = null;
    }

    var readFns = readOldData(this, context),
        that    = this;

    async.parallel(readFns, function (err) {
        if (err) {
            return callback(err);
        }
        that.state = "pending";
        that.transMan.store.upsert(that.toPersistent(), function (err) {
            if (err) {
                return callback(err);
            }

            var commFns = getCommits(that, context);
            async.series(commFns, function (err, res) {
                if (err) {
                    return that.rollback(context, callback, err);
                }

                that.transMan.store.delete(that.id);
                callback(null, res);
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
    return JSON.stringify(this.toPersistent());
};

module.exports = Transaction;

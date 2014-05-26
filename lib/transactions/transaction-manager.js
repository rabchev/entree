"use strict";

var Transaction = require("./transaction"),
    Err         = require("../utils/error");

function TransactionManager(store, dataManager) {
    this.store = store;
    this.dataManager = dataManager;
}

TransactionManager.prototype.set = function (transId, colls, callback) {
    var args = [null],
        trans;

    if (typeof colls === "function") {
        callback = colls;
        colls = null;
    }

    if (typeof transId === "function") {
        callback = transId;
        transId = null;
    } else if  (Array.isArray(transId)) {
        colls = transId;
        transId = null;
    }

    try {
        if (transId) {
            this.store.get(transId, function (err, res) {
                if (err && err.code !== "ITEM_DOESNOT_EXIST") {
                    return callback(err);
                }
                trans = new Transaction(this, transId, colls, res);
            });
        } else {
            trans = new Transaction(this, null, colls);
        }
    } catch (err) {
        callback(err);
    }

    if (colls) {
        colls.forEach(function (el) {
            args.push(trans[el]);
        });
    }
    args.push(trans);
    callback.apply(null, args);

    if (transId && trans.status === "initial") {
        trans.save();
    }
};

TransactionManager.prototype.commit = function (context, transId, callback) {
    if (!transId || typeof transId === "function") {
        callback = transId;
        transId = context;
        context = null;
    }

    if (!transId) {
        var err = new Err("MISSING_ARG", ["transId"]);
        if (callback) {
            return callback(err);
        }
        throw err;
    }

    try {
        this.store.get(transId, function (err, res) {
            if (err) {
                return callback(err);
            }
            new Transaction(this, transId, null, res).commit(context, callback);
        });
    } catch (err) {
        callback(err);
    }
};

TransactionManager.prototype.cancel = function (transId, callback) {
    this.store.delete(transId, callback);
};

module.exports = TransactionManager;

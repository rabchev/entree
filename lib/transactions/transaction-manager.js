/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Transaction = require("./transaction");

function addCollection(collName, man, trans) {
    if (!trans[collName]) {
        //trans[collName] = new Array();
    }
}

function TransactionManager(store, manager) {
    this.store = store;
    this.manager = manager;
}

TransactionManager.prototype.set = function (transId, colls, callback) {
    var that    = this,
        trans;

    if (transId) {
        this.store.get(transId, function (err, res) {
            if (err && err.code !== "ITEM_DOESNOT_EXIST") {
                return callback(err);
            }
            trans = new Transaction(this.manager, transId, colls, res);
        });
    } else {
        trans = new Transaction(this.manager, null, colls);
    }


};

module.exports = TransactionManager;

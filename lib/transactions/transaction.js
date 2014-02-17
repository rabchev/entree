/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var uuid        = require("node-uuid"),
    Wrapper     = require("./collection-wrapper");

function Transaction(manager, transId, collections) {
    var that = this;

    this.id = transId || uuid.v1();
    this.manager = manager;

    if (!collections) {
        collections = manager.collections;
    }

    collections.forEach(function (el) {
        that[el.name] = new Wrapper(el);
    });
}

module.exports = Transaction;

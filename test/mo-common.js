/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/mongodb",
    connStr     = "mongodb://localhost/entreeTest",
    options     = {
        name: "blogs",
        identifier: "_id"
    },
    messages    = {
//        item_doesnt_exist: "{\"message\":\"Item not found.\",\"errorCode\":801}"
    };

function init(callback) {
    var MongoClient = require('mongodb').MongoClient;

    MongoClient.connect(connStr, function (err, db) {
        if (err) {
            throw err;
        }
        db.collection(options.name).drop(function (err) {
            db.close();
            if (err && err.message !== "ns not found") {
                throw err;
            }
            callback();
        });
    });
}

module.exports = testCase.getTestCase(provider, connStr, options, messages, init);

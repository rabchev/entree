/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/mongodb",
    options     = {
        connStr: "mongodb://localhost/entreeTest"
    },
    schema     = {
        __collName: "blogs",
        identifier: "_id"
    },
    messages    = {
//        item_doesnt_exist: "{\"message\":\"Item not found.\",\"errorCode\":801}"
    };

function init(callback) {
    var MongoClient = require('mongodb').MongoClient;

    MongoClient.connect(options.connStr, function (err, db) {
        if (err) {
            throw err;
        }
        db.collection(schema.__collName).drop(function (err) {
            db.close();
            if (err && err.message !== "ns not found") {
                throw err;
            }
            callback();
        });
    });
}

module.exports = testCase.getTestCase(provider, options, schema, messages, init);

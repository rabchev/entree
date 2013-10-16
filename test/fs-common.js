/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/file-system",
    connStr     = __dirname + "/data",
    options     = { typeName: "blogs", identifier: "_id", option: 1, foo: "bar" },
    wrench      = require("wrench"),
    fs          = require("fs");

if (fs.existsSync(connStr)) {
    wrench.rmdirSyncRecursive(connStr);
    fs.mkdirSync(connStr);
} else {
    fs.mkdirSync(connStr);
}

module.exports = testCase.getTestCase(provider, connStr, options);

/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/file-system",
    connStr     = __dirname + "/data",
    options     = { name: "blogs", identifier: "_id", option: 1, foo: "bar" },
    wrench      = require("wrench"),
    fs          = require("fs"),
    path        = connStr + "/blogs";

if (!fs.existsSync(connStr)) {
    fs.mkdirSync(connStr);
} else if (fs.existsSync(path)) {
    wrench.rmdirSyncRecursive(path);
}

module.exports = testCase.getTestCase(provider, connStr, options);

/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/file-system",
    options     = {
        connStr: __dirname + "/data"
    },
    schema      = { __collName: "blogs", identifier: "_id", option: 1, foo: "bar" },
    wrench      = require("wrench"),
    fs          = require("fs"),
    path        = options.connStr + "/blogs";

if (!fs.existsSync(options.connStr)) {
    fs.mkdirSync(options.connStr);
} else if (fs.existsSync(path)) {
    wrench.rmdirSyncRecursive(path);
}

module.exports = testCase.getTestCase(provider, options, schema);

/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/file-system",
    connStr     = __dirname + "/data",
    options     = { typeName: "blogs", identifier: "_id", option: 1, foo: "bar" };

module.exports = testCase.getTestCase(provider, connStr, options);

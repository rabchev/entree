/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "./mocks/post-provider",
    connStr     = "test connection string",
    options     = { identifier: "_id", option: 1, foo: "bar" };

module.exports = testCase.getTestCase(provider, connStr, options);

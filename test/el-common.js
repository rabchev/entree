/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var testCase    = require("./common-provider"),
    provider    = "../lib/providers/everlive",
    connStr     = "https://api.everlive.com/v1/uZEGyZYKiSq5CTSq/",
    options     = {
        typeName: "blogs",
        identifier: "_id"//,
        //authorization: "MasterKey PqmmvlWWBF5svReW7p3mkYG9X61nus1w"
    };

module.exports = testCase.getTestCase(provider, connStr, options);

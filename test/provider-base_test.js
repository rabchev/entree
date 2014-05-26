"use strict";

var testCase    = require("./common-provider"),
    provider    = "./mocks/post-provider",
    options     = {
        connStr: "test connection string"
    },
    schema     = { __collName: "test", identifier: "_id", option: 1, foo: "bar" };

module.exports = testCase.getTestCase(provider, options, schema);

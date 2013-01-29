/*jslint plusplus: true, devel: true, nomen: true, node: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var testCase        = require("nodeunit").testCase,
    PostProvider    = require("./mocks/post-provider");

module.exports = testCase({
    "Insert Item": function (test) {
        "use strict";
        
        var prov = new PostProvider("test connection string", { option: 1, foo: "bar" });
        prov.insert({
            user: "shushi"
        }, {
            _id: 556617,
            title: "Test Post",
            author: "Me Me Me",
            age: 43
        }, function (err, result) {
            test.ok(result);
        });
        
        test.done();
    }
});
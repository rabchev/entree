/*jslint plusplus: true, devel: true, nomen: true, node: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var testCase        = require("nodeunit").testCase,
    PostProvider    = require("./mocks/post-provider"),
    provider,
    context;

debugger;

module.exports = testCase({
    "Fixture Setup": function (test) {
        "use strict";
        
        test.expect(2);
        
        var connStr     = "test connection string",
            options     = { identifier: "_id", option: 1, foo: "bar" };
        
        context = {
            user: {
                id: "FB5544",
                name: "John Smit",
                roles: [
                    "Managers",
                    "Contributers",
                    "Users"
                ]
            }
        };
        
        provider = new PostProvider(connStr, options);
        
        test.equal(provider.connectionString, connStr);
        test.equal(provider.options, options);
        
        test.done();
    },
    "Insert Item": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.insert(context, {
            _id: 556617,
            title: "Test Post",
            author: "Me Me Me",
            age: 43
        }, function (err, result) {
            
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, 556617);
            test.equal(result.title, "Test Post");
            test.equal(result.author, "Me Me Me");
            test.equal(result.age, 43);
            
            test.done();
        });
    },
    "Get Item": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.get(context, {
            _id: 556617
        }, function (err, result) {
            
            test.ok(!err);
            test.ok(result);
            test.equal(result._id, 556617);
            test.equal(result.title, "Test Post");
            test.equal(result.author, "Me Me Me");
            test.equal(result.age, 43);
            
            test.done();
        });
    }
});
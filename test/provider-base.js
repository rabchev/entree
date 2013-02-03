/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var testCase        = require("nodeunit").testCase,
    PostProvider    = require("./mocks/post-provider"),
    data            = [
        {
            title: "Calipso - Fading Away",
            author: "Claudia Rice",
            age: 22
        },
        {
            title: "Thoughts On Paper",
            author: "Adam Boil",
            age: 36
        },
        {
            title: "Neonatology Review",
            author: "Florance Downing",
            age: 61
        },
        {
            title: "A Hopeful Life",
            author: "Carlos Rivera",
            age: 52
        },
        {
            title: "Second Chances",
            author: "Samantha  Morgan",
            age: 22
        },
        {
            title: "Brotherhood Of Men",
            author: "John Smit",
            age: 43
        }
    ],
    provider,
    context;

function assertFirstItem(test, err, result) {
    "use strict";
    
    test.ok(!err);
    test.ok(result);
    test.equal(result._id, 556617);
    test.equal(result.title, "Test Post");
    test.equal(result.author, "Me Me Me");
    test.equal(result.age, 43);
}

function assertUpdatedItem(test, err, result) {
    "use strict";
    
    test.ok(!err);
    test.ok(result);
    test.equal(result._id, 556617);
    test.equal(result.title, "Updated Post");
    test.equal(result.author, "Fred Goldman");
    test.equal(result.age, 55);
}

function insertTestData(callback) {
    "use strict";
    
    var item = data.shift();
    if (item) {
        provider.insert(context, item, function (err, item) {
            if (err) {
                throw err;
            }
            insertTestData(callback);
        });
    } else {
        data = null;
        callback();
    }
}

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
            
            assertFirstItem(test, err, result);
            test.done();
        });
    },
    "Get Item by Example": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.get(context, {
            _id: 556617
        }, function (err, result) {
            
            assertFirstItem(test, err, result);
            test.done();
        });
    },
    "Get Item by ID": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.get(context,
            556617,
            function (err, result) {
                
                assertFirstItem(test, err, result);
                test.done();
            });
    },
    "Update Item": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.update(context, {
            _id: 556617,
            title: "Updated Post",
            author: "Fred Goldman",
            age: 55
        }, function (err, result) {
            
            assertUpdatedItem(test, err, result);
            test.done();
        });
    },
    "Get Updated Item by ID": function (test) {
        "use strict";
        
        test.expect(6);
                
        provider.get(context,
            556617,
            function (err, result) {
                
                assertUpdatedItem(test, err, result);
                test.done();
            });
    },
    "Delete Item by ID": function (test) {
        "use strict";
        
        test.expect(2);
                
        provider.delete(context,
            556617,
            function (err, result) {
                
                test.ok(!err);
                test.ok(result);
                test.done();
            });
    },
    "Get Deleted Item by ID": function (test) {
        "use strict";
        
        test.expect(3);
                
        provider.get(context,
            556617,
            function (err, result) {
                
                test.ok(err);
                test.ok(!result);
                test.equal(err.message, "Item doesn't exists.");
                test.done();
            });
    },
    "Select Query Without Callback": function (test) {
        "use strict";
        
        test.expect(4);
        
        insertTestData(function () {
        
            var cursor = provider.select(context, { age: 22 });
            test.ok(cursor);
            
            cursor.toArray(function (err, arr) {
                test.ok(!err);
                test.equal(arr.length, 2);
                test.equal(arr[0].author, "Claudia Rice");
                test.done();
            });
        });
    },
    "Select All With Callback": function (test) {
        "use strict";
        
        test.expect(4);
                
        provider.select(context, function (err, cursor) {
            
            test.ok(!err);
            test.ok(cursor);
        
            cursor.toArray(function (err, arr) {
                test.ok(!err);
                test.equal(arr.length, 6);
                
                test.done();
            });
        });
    },
    "Limit & Each": function (test) {
        "use strict";
        
        test.expect(2);
        
        var cursor = provider.select(context, null, null, { limit: 3 });
        test.ok(cursor);
        
        var count = 0;
        cursor.each(function (err, item) {
            if (item) {
                count++;
            } else {
                test.equal(count, 3);
                test.done();
            }
        });
    },
    "Skip & Limit": function (test) {
        "use strict";
        
        test.expect(5);
        
        var cursor = provider.select(context, null, null, { skip: 2, limit: 2 });
        test.ok(cursor);
        
        cursor.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 2);
            test.equal(arr[0].author, "Florance Downing");
            test.equal(arr[1].author, "Carlos Rivera");
            
            test.done();
        });
    },
    "Projection": function (test) {
        "use strict";
        
        test.expect(10);
        
        var cursor = provider.select(context, null, ["age"]);
        test.ok(cursor);
        
        cursor.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 6);
            test.equal(arr[0].age, 22);
            test.equal(arr[1].age, 36);
            test.equal(arr[5].age, 43);
            test.ok(!arr[0].author);
            test.ok(!arr[0].title);
            test.ok(!arr[5].author);
            test.ok(!arr[5].title);
            
            test.done();
        });
    },
    "Synchronous Select": function (test) {
        "use strict";
        
        test.expect(3);
        
        provider.sync = true;
        var cursor = provider.select(context);
        test.ok(cursor);
        
        cursor.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 6);
                                    
            provider.sync = false;
            
            test.done();
        });
    },
    "Update With Interceptoin": function (test) {
        "use strict";
        
        test.done();
        
        
    }
});
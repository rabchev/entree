/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";
debugger;

var testCase        = require("nodeunit").testCase,
    PostProvider    = require("./mocks/post-provider"),
    interceptor     = require("./mocks/interceptor"),
    data            = [
        {
            title: "Calipso - Fading Away",
            author: "Claudia Rice",
            age: 22,
            publisher: {
                name: "TLC",
                address: {
                    street: "eram officia quis eram fugiat",
                    number: 1544
                },
                priority: 0.5
            }
        },
        {
            title: "Thoughts On Paper",
            author: "Adam Boil",
            age: 36,
            publisher: {
                name: "TLC",
                address: {
                    street: "coniunctione officia eram ingeniis occaecat non",
                    number: 1544
                },
                priority: 0.2
            }
        },
        {
            title: "Neonatology Review",
            author: "Florance Downing",
            age: 61,
            publisher: {
                name: "TLC",
                address: {
                    street: "malis labore aliquip labore nescius litteris",
                    number: 278
                },
                priority: 1.5
            }
        },
        {
            title: "A Hopeful Life",
            author: "Carlos Rivera",
            age: 52,
            publisher: {
                name: "ABB",
                address: {
                    street: "ingeniis lorem eiusmod illustriora eram incurreret",
                    number: 963587
                },
                priority: 0.25
            }
        },
        {
            title: "Second Chances",
            author: "Samantha  Morgan",
            age: 22,
            publisher: {
                name: "ABB",
                address: {
                    street: "",
                    number: 336
                },
                priority: 2.5
            }
        },
        {
            title: "Brotherhood Of Men",
            author: "John Smit",
            age: 43,
            publisher: {
                name: "BBA",
                address: {
                    street: "",
                    number: 1544
                },
                priority: 0.5
            }
        }
    ],
    provider,
    context;

function assertFirstItem(test, err, result) {

    test.ok(!err);
    test.ok(result);
    test.equal(result._id, 556617);
    test.equal(result.title, "Test Post");
    test.equal(result.author, "Me Me Me");
    test.equal(result.age, 43);
}

function assertUpdatedItem(test, err, result) {

    test.ok(!err);
    test.ok(result);
    test.equal(result._id, 556617);
    test.equal(result.title, "Updated Post");
    test.equal(result.author, "Fred Goldman");
    test.equal(result.age, 55);
}

function insertTestData(callback) {

    var item = data.shift();
    if (item) {
        provider.insert(context, item, function (err) {
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

        test.expect(6);

        provider.get(context, {
            _id: 556617
        }, function (err, result) {

            assertFirstItem(test, err, result);
            test.done();
        });
    },
    "Get Item by ID": function (test) {

        test.expect(6);

        provider.get(context,
            556617,
            function (err, result) {

                assertFirstItem(test, err, result);
                test.done();
            });
    },
    "Update Item": function (test) {

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

        test.expect(6);

        provider.get(context,
            556617,
            function (err, result) {

                assertUpdatedItem(test, err, result);
                test.done();
            });
    },
    "Delete Item by ID": function (test) {

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

        test.expect(3);

        provider.get(context,
            556617,
            function (err, result) {

                test.ok(err);
                test.ok(!result);
                test.equal(err.message, "Item doesn't exist.");
                test.done();
            });
    },
    "Select Query Without Callback": function (test) {

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

        test.expect(2);

        var cursor = provider.select(context, null, { limit: 3 });
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

        test.expect(5);

        var cursor = provider.select(context, null, { skip: 2, limit: 2 });
        test.ok(cursor);

        cursor.toArray(function (err, arr) {
            test.ok(!err);
            test.equal(arr.length, 2);
            test.equal(arr[0].author, "Florance Downing");
            test.equal(arr[1].author, "Carlos Rivera");

            test.done();
        });
    },
    "Fluent Skip & Limit": function (test) {

        test.expect(5);

        provider.select(context)
            .skip(1)
            .limit(3)
            .toArray(function (err, arr) {
                test.ok(!err);
                test.equal(arr.length, 3);
                test.equal(arr[0].author, "Adam Boil");
                test.equal(arr[1].author, "Florance Downing");
                test.equal(arr[2].author, "Carlos Rivera");

                test.done();
            });
    },
    "Map": function (test) {

        test.expect(10);

        var cursor = provider.select(context, null, { map: ["age"] });
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
    "Fluent Map": function (test) {

        test.expect(9);

        provider.select(context)
            .map(["age"])
            .toArray(function (err, arr) {
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
    "Just Select": function (test) {

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
    "Interceptoin - Insert": function (test) {

        test.expect(11);

        provider.use(interceptor.security);
        provider.use(interceptor.logging);

        provider.insert(context, {
            _id: 556617,
            title: "Test Post",
            author: "Me Me Me",
            age: 43
        }, function (err, result) {

            assertFirstItem(test, err, result);

            var entry;

            test.equal(interceptor.logdata.length, 2);

            entry = interceptor.logdata[0];
            test.equal(entry.action, "_insert");
            test.equal(entry.message, "Security check passed.");

            entry = interceptor.logdata[1];
            test.equal(entry.action, "_insert");
            test.equal(entry.message, "success");

            test.done();
        });
    },
    "Interceptoin - Select": function (test) {

        test.expect(8);

        var cursor = provider.select(context);
        test.ok(cursor);

        test.equal(interceptor.logdata.length, 4);

        var entry = interceptor.logdata[2];
        test.equal(entry.action, "_select");
        test.equal(entry.message, "Security check passed.");

        entry = interceptor.logdata[3];
        test.equal(entry.action, "_select");
        test.equal(entry.message, "Cursor returned");

        cursor.toArray(function (err, arr) {

            test.ok(!err);
            test.equal(arr.length, 7);

            test.done();
        });
    },
    "Interceptoin - Select With Callback": function (test) {

        test.expect(9);

        provider.select(context, function (err, cursor) {

            test.ok(!err);
            test.ok(cursor);

            test.equal(interceptor.logdata.length, 6);

            var entry = interceptor.logdata[4];
            test.equal(entry.action, "_select");
            test.equal(entry.message, "Security check passed.");

            entry = interceptor.logdata[5];
            test.equal(entry.action, "_select");
            test.equal(entry.message, "success");

            cursor.toArray(function (err, arr) {

                test.ok(!err);
                test.equal(arr.length, 7);

                test.done();
            });
        });
    },
    "Interceptoin - Access Denied": function (test) {

        test.expect(3);

        interceptor.logdata.length = 0;

        provider.get({ user: {} }, 556617, function (err, item) {

            test.ok(!item);
            test.equal(err.message, "Access denied!");
            test.equal(interceptor.logdata.length, 0);

            test.done();
        });
    },
    "Interceptoin - Modify Data": function (test) {

        test.expect(6);

        provider.use(interceptor.timestamp);

        provider.get(context, 556617, function (err, item) {

            test.ok(item.timestamp instanceof Date);
            test.equal(interceptor.logdata.length, 2);

            var entry = interceptor.logdata[0];
            test.equal(entry.action, "_get");
            test.equal(entry.message, "Security check passed.");

            entry = interceptor.logdata[1];
            test.equal(entry.action, "_get");
            test.equal(entry.message, "success");

            test.done();
        });
    },
    "Interceptoin - Wrap Cursor": function (test) {

        test.expect(9);

        provider
            .select()
            .toArray(function (err, arr) {

                test.ok(!err);
                test.equal(arr.length, 7);

                var i;
                for (i = 0; i < arr.length; i++) {
                    test.ok(arr[i].timestamp instanceof Date);
                }

                test.done();
            });
    },
    "Sort One Field Ascending": function (test) {
        test.expect(8);

        provider
            .select(context)
            .sort({age: 1})
            .toArray(function (err, arr) {

                test.ok(!err);
                test.equal(arr.length, 7);

                var i, age;
                for (i = 0; i < arr.length; i++) {
                    if (age) {
                        test.ok(age <= arr[i].age);
                    }
                    age = arr[i].age;
                }

                test.done();
            });
    },
    "Sort One Field Descending": function (test) {
        test.expect(8);

        provider
            .select()
            .sort({age: -1})
            .toArray(function (err, arr) {

                test.ok(!err);
                test.equal(arr.length, 7);

                var i, age;
                for (i = 0; i < arr.length; i++) {
                    if (age) {
                        test.ok(age >= arr[i].age);
                    }
                    age = arr[i].age;
                }

                test.done();
            });
    },
    "Sort Two Fields in Opposite Directions": function (test) {
        test.expect(7);

        provider
            .select()
            .sort({"publisher.name": 1, age: -1})
            .toArray(function (err, arr) {

                test.ok(!err);
                test.equal(arr.length, 7);

                var i, name;
                for (i = 0; i < arr.length; i++) {
                    if (arr[i].publisher) {
                        if (name) {
                            test.ok(name <= arr[i].publisher.name);
                        }
                        name = arr[i].publisher.name;
                    }
                }

                test.done();
            });
    }
});

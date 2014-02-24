/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var _               = require("lodash"),
    testCase        = require("nodeunit").testCase,
    interceptor     = require("./mocks/interceptor"),
    Context         = require("../lib/utils/context"),
    provider,
    context;

function getData() {
    return [
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
    ];
}

function assertFirstItem(test, err, result) {

    test.ok(!err);
    test.ok(result);
    test.equal(result._id, "797ff043-11eb-11e1-80d6-510998755d10");
    test.equal(result.title, "Test Post");
    test.equal(result.author, "Me Me Me");
    test.equal(result.age, 43);
}

function assertUpdatedItem(test, err, result) {

    test.ok(!err);
    test.ok(result);
    test.equal(result._id, "797ff043-11eb-11e1-80d6-510998755d10");
    test.equal(result.title, "Updated Post");
    test.equal(result.author, "Fred Goldman");
    test.equal(result.age, 55);
}

function insertTestData(callback) {
    provider.insert(context, getData(), function (err) {
        if (err) {
            throw err;
        }
        callback();
    });
}

exports.getTestCase = function (Provider, options, schema, messages, init) {
    if (!_.isFunction(Provider)) {
        Provider = require(Provider);
    }

    var msg = {
        item_doesnt_exist: "Item does not exist."
    };

    if (messages) {
        msg = _.extend(msg, messages);
    }

    return testCase({
        "Fixture Setup": function (test) {

            test.expect(2);

            provider = new Provider(options, schema);

            context = new Context({
                user: {
                    id: "FB5544",
                    name: "John Smit",
                    roles: [
                        "Managers",
                        "Contributers",
                        "Users"
                    ]
                }
            });

            test.equal(provider.options.connStr, options.connStr);
            test.equal(provider.options, options);

            function initProvider() {
                provider.init(function (err) {
                    if (err) {
                        throw err;
                    }
                    test.done();
                });
            }

            if (init) {
                init(function (err) {
                    if (err) {
                        throw err;
                    }
                    initProvider();
                });
            } else {
                initProvider();
            }
        },
        "Insert Item": function (test) {

            test.expect(6);

            provider.insert(context, {
                _id: "797ff043-11eb-11e1-80d6-510998755d10",
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
                _id: "797ff043-11eb-11e1-80d6-510998755d10"
            }, function (err, result) {

                assertFirstItem(test, err, result);
                test.done();
            });
        },
        "Get Item by ID": function (test) {

            test.expect(6);

            provider.get(context,
                "797ff043-11eb-11e1-80d6-510998755d10",
                function (err, result) {

                    assertFirstItem(test, err, result);
                    test.done();
                });
        },
        "Update Item With Replace": function (test) {

            test.expect(6);

            provider.update(context, {
                _id: "797ff043-11eb-11e1-80d6-510998755d10",
                title: "Updated Post",
                author: "Fred Goldman",
                age: 55
            }, function (err, result) {
                if (_.isNumber(result)) {
                    provider.get("797ff043-11eb-11e1-80d6-510998755d10",
                        function (err, res) {
                            if (err) {
                                throw err;
                            }
                            assertUpdatedItem(test, err, res);
                            test.done();
                        });
                } else {
                    assertUpdatedItem(test, err, result);
                    test.done();
                }
            });
        },
        "Get Updated Item by ID": function (test) {

            test.expect(6);

            provider.get(context,
                "797ff043-11eb-11e1-80d6-510998755d10",
                function (err, result) {

                    assertUpdatedItem(test, err, result);
                    test.done();
                });
        },
        "Update Item With Replace and Without Callback": function (test) {

            test.expect(3);

            provider.update({
                _id: "797ff043-11eb-11e1-80d6-510998755d10",
                title: "Updated Post 2",
                age: 155
            });

            setTimeout(function () {
                provider.get("797ff043-11eb-11e1-80d6-510998755d10",
                    function (err, result) {
                        test.ok(!err);
                        test.equal(result.title, "Updated Post 2");
                        test.equal(result.age, 155);
                        test.done();
                    });
            }, 150);
        },
        "Update Item & Context Without Callback": function (test) {

            test.expect(2);

            provider.update(context, {
                _id: "797ff043-11eb-11e1-80d6-510998755d10",
                age: 255
            });

            setTimeout(function () {
                provider.get("797ff043-11eb-11e1-80d6-510998755d10",
                    function (err, result) {
                        test.ok(!err);
                        test.equal(result.age, 255);
                        test.done();
                    });
            }, 150);
        },
        "Delete Item by ID": function (test) {

            test.expect(2);

            provider.delete(context,
                "797ff043-11eb-11e1-80d6-510998755d10",
                function (err, result) {

                    test.ok(!err);
                    test.ok(result);
                    test.done();
                });
        },
        "Get Deleted Item by ID": function (test) {

            test.expect(3);

            provider.get(context,
                "797ff043-11eb-11e1-80d6-510998755d10",
                function (err, result) {

                    test.ok(err);
                    test.ok(!result);
                    test.equal(err.code, "ITEM_DOESNOT_EXIST");
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
        "Select One": function (test) {

            test.expect(2);

            provider.selectOne(context, { age: 22 }, function (err, result) {
                test.ok(!err);
                test.equal(result.author, "Claudia Rice");
                test.done();
            });
        },
        "Select One Without Context": function (test) {

            test.expect(2);

            provider.selectOne({ age: 22 }, function (err, result) {
                test.ok(!err);
                test.equal(result.author, "Claudia Rice");
                test.done();
            });
        },
        "Select One With Options": function (test) {

            test.expect(4);

            provider.selectOne({ age: 22 }, { map: ["author"] }, function (err, result) {
                test.ok(!err);
                test.equal(result.author, "Claudia Rice");
                test.ok(!result.age);
                test.ok(!result.title);
                test.done();
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

            test.expect(3);

            var cursor = provider.select(context, null, { skip: 2, limit: 2 });
            test.ok(cursor);

            cursor.toArray(function (err, arr) {
                test.ok(!err);
                test.equal(arr.length, 2);

                test.done();
            });
        },
        "Fluent Skip & Limit": function (test) {

            test.expect(2);

            provider.select(context)
                .skip(1)
                .limit(3)
                .toArray(function (err, arr) {
                    test.ok(!err);
                    test.equal(arr.length, 3);

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
                test.ok(arr[0].age);
                test.ok(arr[1].age);
                test.ok(arr[5].age);
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
                    test.ok(arr[0].age);
                    test.ok(arr[1].age);
                    test.ok(arr[5].age);
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

            interceptor.logdata.length = 0;
            provider.use(interceptor.security);
            provider.use(interceptor.logging);

            provider.insert(context, {
                _id: "797ff043-11eb-11e1-80d6-510998755d10",
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

            provider.get({ user: {} }, "797ff043-11eb-11e1-80d6-510998755d10", function (err, item) {

                test.ok(!item);
                test.equal(err.message, "Access denied!");
                test.equal(interceptor.logdata.length, 0);

                test.done();
            });
        },
        "Interceptoin - Modify Data": function (test) {

            test.expect(6);

            provider.use(interceptor.timestamp);

            provider.get(context, "797ff043-11eb-11e1-80d6-510998755d10", function (err, item) {

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
            test.expect(10);

            provider
                .select()
                .sort({"publisher.name": 1, age: -1})
                .toArray(function (err, arr) {

                    test.ok(!err);
                    test.equal(arr.length, 7);

                    var i, name, age;
                    for (i = 0; i < arr.length; i++) {
                        if (arr[i].publisher) {
                            if (name) {
                                test.ok(name <= arr[i].publisher.name);
                            }
                            if (age && name === arr[i].publisher.name) {
                                test.ok(age >= arr[i].age);
                            }
                            name = arr[i].publisher.name;
                            age = arr[i].age;
                        }
                    }

                    test.done();
                });
        },
        "Select With Sort": function (test) {
            test.expect(7);

            provider
                .select({"publisher.name": "TLC"})
                .sort({age: 1})
                .toArray(function (err, arr) {

                    test.ok(!err);
                    test.equal(arr.length, 3);

                    var i, age;
                    for (i = 0; i < arr.length; i++) {
                        test.equal(arr[i].publisher.name, "TLC");
                        if (age) {
                            test.ok(age <= arr[i].age);
                        }
                        age = arr[i].age;
                    }

                    test.done();
                });
        },
        "Count Selected": function (test) {
            test.expect(2);

            provider
                .select({"publisher.name": "TLC"})
                .count(function (err, count) {

                    test.ok(!err);
                    test.equal(count, 3);

                    test.done();
                });
        },
        "Count All": function (test) {
            test.expect(2);

            provider
                .select()
                .count(function (err, count) {

                    test.ok(!err);
                    test.equal(count, 7);

                    test.done();
                });
        },
        "Bulk Update Selected": function (test) {
            test.expect(4);

            provider
                .select(new Context(null), {"publisher.name": "TLC"})
                .update({$set: { age: 555 }},
                    function (err) {
                        test.ok(!err);
                        provider
                            .select({ age: 555})
                            .toArray(function (err, arr) {
                                test.ok(!err);
                                test.equal(arr.length, 3);
                                test.equal(arr[0].age, 555);

                                test.done();
                            });
                    });
        },
        "Select All With Callback & Without Context": function (test) {
            test.expect(5);

            provider.select(function (err, cursor) {
                test.ok(!err);
                test.ok(cursor);
                cursor.toArray(function (err, arr) {
                    test.ok(!err);
                    test.ok(arr);
                    test.equal(arr.length, 7);
                    test.done();
                });
            });
        },
        "Select All With Callback & With Context": function (test) {
            test.expect(5);

            provider.select(context, function (err, cursor) {
                test.ok(!err);
                test.ok(cursor);
                cursor.toArray(function (err, arr) {
                    test.ok(!err);
                    test.ok(arr);
                    test.equal(arr.length, 7);
                    test.done();
                });
            });
        },
        "Select With Callback & Without Context": function (test) {
            test.expect(5);

            provider.select({"publisher.name": "TLC"}, function (err, cursor) {
                test.ok(!err);
                test.ok(cursor);
                cursor.toArray(function (err, arr) {
                    test.ok(!err);
                    test.ok(arr);
                    test.equal(arr.length, 3);
                    test.done();
                });
            });
        },
        "Insert With Operators Should Throw": function (test) {
            test.expect(1);

            provider.insert({
                $set: {
                    title: "Blah Blah Blah",
                    author: "ad laborum",
                    age: 20,
                    publisher: {
                        name: "TLC",
                        address: {
                            street: "eram officia quis eram fugiat",
                            number: 1544
                        },
                        priority: 0.4
                    }
                }
            }, function (err, cursor) {
                test.equal(err.code, "OPERS_NOT_ALLOWED");
                test.done();
            });
        },
        "Bulk Insert With Operators Should": function (test) {
            test.expect(7);

            provider.insert([
                {
                    _id: "op-001",
                    title: "Foo Bar Foo Bar",
                    author: "ad laborum",
                    age: 30,
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
                    $set: {
                        _id: "op-002",
                        title: "Blah Blah Blah",
                        author: "ad laborum",
                        age: 20,
                        publisher: {
                            name: "TLC",
                            address: {
                                street: "eram officia quis eram fugiat",
                                number: 1544
                            },
                            priority: 0.4
                        }
                    }
                },
                {
                    _id: "op-003",
                    title: "nulla veniam graviterque officia",
                    author: "ad laborum",
                    age: 35,
                    publisher: {
                        name: "TLC",
                        address: {
                            street: "eram officia quis eram fugiat",
                            number: 1544
                        },
                        priority: 0.4
                    }
                }
            ], function (err, cursor) {
                test.equal(err.code, "OPERS_NOT_ALLOWED");
                provider.select({author: "ad laborum"})
                    .sort({_id: 1})
                    .toArray(function (err, arr) {
                        test.ok(!err);
                        test.equal(arr.length, 2);
                        test.equal(arr[0]._id, "op-001");
                        test.equal(arr[0].title, "Foo Bar Foo Bar");
                        test.equal(arr[1]._id, "op-003");
                        test.equal(arr[1].title, "nulla veniam graviterque officia");

                        test.done();
                    });
            });
        },
        "Bulk Delete Selected": function (test) {
            test.expect(3);

            provider
                .select({"publisher.name": "TLC"})
                .delete(function (err) {
                    test.ok(!err);
                    provider
                        .select({ age: 555})
                        .count(function (err, count) {
                            test.ok(!err);
                            test.equal(count, 0);

                            test.done();
                        });
                });
        },
        "Delete All The Rest": function (test) {
            test.expect(3);

            provider
                .select()
                .delete(function (err) {
                    test.ok(!err);
                    provider
                        .select()
                        .count(function (err, count) {
                            test.ok(!err);
                            test.equal(count, 0);

                            test.done();
                        });
                });
        },
        "Fixture Tear Down": function (test) {
            test.expect(0);
            provider.dispose(function (err) {
                if (err) {
                    throw err;
                }
                test.done();
            });
        }
    });
};

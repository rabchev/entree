/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var entree      = require("entree"),
    authority   = require("authority"),
    logger      = entree.resolveInterceptor("log"),
    connection1,
    connection2,
    schema,
    options,
    interceptor1,
    interceptor2;


entree
    .addConnection("fs-default", "file-system", "./data")
    .addConnection("mongo-node:1", "mongodb", "mongodb://localhost/node1")
    .addColleciton("users", "fs-default", [interceptor1, interceptor2], schema)
    .addCollection("_odd-articles")
        .setConnection("fs-default")
        .setSchema(schema)
        .use(logger({ level: "info", log: { action: true, query: true }}, ["insert", "delete"]))
        .done(function (err) { console.log(err); })
    .addCollection("_even-articles")
        .setConnection("mongo-node:1")
        .setSchema(schema)
        .done()
    .addReplicaSet("articles", ["-odd-articles", "-even-articles"], options)
    .addShard("comments")
        .setConnections([connection1, connection2])
        .setSchema(schema);

entree.users.get("blah@lbah.com", function (err, user) {

});

var tran = entree.transaction.begin();
tran.users.update({});
tran.posts.update({});
tran.comments.delete({});
tran.commit(function (err, results) {

});

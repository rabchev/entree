/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    Err         = require("./utils/error"),
    object      = require("./utils/object"),
    async       = require("async");

function write(replica, method, context, items, callback) {
    var args = object.validateArgs([context, items, callback], "item");
    if (!args) {
        return;
    }

    if (replica.writeStrategy === "rollback") {
        replica.manager.transaction.set(function (err, trans) {
            if (err) {
                args.callback(err);
            }
            replica.collections.forEach(function (el) {
                trans[el][method](args.item);
            });
            trans.commit(args.context, args.callback);
        });
    } else {
        var fns = [];
        replica.collections.forEach(function (el) {
            fns.push(function (cb) {
                replica.manager[el][method](args.context, args.item, cb);
            });
        });
        async.parallel(fns, args.callback);
    }
}

/**
 * Constructor for the Replica class.
 *
 * Replica sets are used just like regular data collections.
 * Please see {@link Provider} for usage reference.
 *
 * Options:
 *
 * - `master` {string} - Defines the master collection in the replica set.
 * If omitted the first collection in the set is assumed to be the master.
 * - `readStrategy` {string} - Defines the read strategy for the replica set.
 * See {@link Replica#readStrategy}.
 * - `writeStrategy` {string} - Defines the write strategy for the replica set.
 * See {@link Replica#writeStrategy}.
 *
 * @class Represents a replica set.
 * @param {Manager} manager - An EntreeJS instance.
 * @param {string[]} colls - The names of the data collections participating in the replica set.
 * There must be at least two collections in the array.
 * @param {object=} opts - Additional options.
 */
function Replica(manager, colls, opts) {
    if (!Array.isArray(colls) || colls.length < 2) {
        throw new Err(Strings.ERR_COLLS_ARG);
    }

    if (!opts) {
        opts = {};
    }

    /**
     * The EntreJS instance holding this replica set.
     */
    this.manager = manager;

    /**
     * An array of the names of the data collections participating in the replica set.
     */
    this.collections = colls;

    /**
     * Defines the master collection in the replica set.
     * If omitted the first collection in the set is assumed to be the master.
     */
    this.master = opts.master || colls[0];

    /**
     * Defines the read strategy for the replica set. Defaults to `master`.
     *
     * - `"master"` - Only the master collection is used for read operations (e.g. get, select).
     * - `"round-robin"` - All collections in the set are cycled for ever read request.
     * - `"feedback"` (not available yet) - Collections with lower latency are given higher priority.
     *
     * Read strategy allows for simple load and throughput balancing of back-end services.
     */
    this.readStrategy = opts.readStrategy || "master";

    /**
     * Defines the write strategy for the replica set. Defaults to `rollback`.
     *
     * - `"rollback"` - Attempts to recover the state of all collections in case any of them fails to write successfully.
     * - `"none"` - Errors on failures are returned but no actions are taken.
     */
    this.writeStrategy = opts.writeStrategy || "rollback";

    this._curr = 0;
}

Replica.prototype._next = function () {
    switch (this.readStrategy) {
    case "master":
        return this.master;
    case "round-robin":
        if (this._curr === this.collections.length) {
            this._curr = 0;
        }
        return this.collections[this._curr++];
    case "feedback":
        // FUTURE: Implement feedback read strategy.
        throw new Error("Feedback strategy not implemented yet.");
    default:
        throw new Error("Invalid read strategy: " + this.readStrategy);
    }
};

Replica.prototype.get = function (context, identity, callback) {
    this.manager[this._next()].get(context, identity, callback);
};

Replica.prototype.select = function (context, query, options, callback) {
    this.manager[this._next()].select(context, query, options, callback);
};

Replica.prototype.insert = function (context, items, callback) {
    write(this, "insert", context, items, callback);
};

Replica.prototype.upsert = function (context, item, callback) {
    write(this, "upsert", context, item, callback);
};

Replica.prototype.update = function (context, item, callback) {
    write(this, "update", context, item, callback);
};

Replica.prototype.delete = function (context, item, callback) {
    write(this, "delete", context, item, callback);
};

module.exports = Replica;

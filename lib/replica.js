/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var Strings     = require("./strings"),
    Err         = require("./error");

function Replica(colls, opts) {
    if (!Array.isArray(colls) || colls.length < 2) {
        throw new Err(Strings.ERR_COLLS_ARG);
    }

    if (!opts) {
        opts = {};
    }

    this.colls = colls;
    this.master = opts.master || colls[0];
}

Replica.prototype.get = function (context, identity, callback) {
    this.manager[this.master].get(context, identity, callback);
};

Replica.prototype.select = function (context, query, options, callback) {
    this.manager[this.master].select(context, query, options, callback);
};


/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var Manager         = require("./manager"),
    _               = require("lodash"),
    manager         = new Manager();

function createInstance(opts, callback) {
    var man;
    if (!callback && opts) {
        callback = opts;
        opts = null;
    }

    if (opts && opts.manager) {
        man = new (require(opts.manager))();
    } else {
        man = new Manager();
    }

    if (opts) {
        man.init(opts, function (err) {
            callback(err, man);
        });
    } else {
        callback(null, man);
    }
}

_.extend(exports, manager);
_.mixin(exports, manager);

exports.manager             = manager;
exports.createInstance      = createInstance;
exports.createManager       = createInstance;

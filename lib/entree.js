/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var Manager         = require("./manager");

function createManger(opts, callback) {
    var man;
    if (!callback) {
        callback = opts;
        opts = {};
    }
    if (opts.manager) {
        man = new (require(opts.manager))(opts);
    } else {
        man = new Manager(opts);
    }
    man.init(function (err) {
        callback(err, man);
    });
}

exports.createManager   = createManger;

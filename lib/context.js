/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, indent: 4, maxerr: 50 */

"use strict";

function Context(obj) {
    if (obj) {
        this.__orgObj = obj;
    } else if (obj === null) {
        this.__isEmpty = true;
    }
}

module.exports = Context;

/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    Strings     = require("../strings"),
    util        = require("util"),
    path        = require("path"),
    uuid        = require('node-uuid'),
    _           = require("underscore");

function EverliveCursor(provider, query, options) {

    Cursor.call(this, provider, query, options);
}

util.inherits(EverliveCursor, Cursor);

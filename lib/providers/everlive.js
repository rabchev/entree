/*jslint node: true, plusplus: true, devel: true, nomen: true, vars: true, indent: 4, maxerr: 50 */

"use strict";

var Cursor      = require("../cursor"),
    Provider    = require("../provider"),
    url         = require("url"),
    util        = require("util"),
    https       = require('https');

function EverliveCursor(provider, query, options) {

    Cursor.call(this, provider, query, options);
}

util.inherits(EverliveCursor, Cursor);

function EverliveProvider(connStr, options) {

    if (options && options.typeName) {
        this.url = url.resolve(connStr, options.typeName);
    } else {
        this.url = connStr;
    }

    Provider.call(this, connStr, options);
}

util.inherits(EverliveProvider, Provider);

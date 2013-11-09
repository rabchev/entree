/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, indent: 4, maxerr: 50 */

"use strict";

var strings = {
    /**
     * Errors
     */
    "NOT_IMPLEMENTED"           : "Method not implemented.",
    "CURSOR_CLOSED"             : "Cursor is closed.",
    "REQUIRES_INT"              : "Argument \"%s\" requires an integer.",
    "MISSING_ARG"               : "Argument \"%s\" is mandatory.",
    "ITEM_EXISTS"               : "Item exits.",
    "ITEM_DOESNOT_EXIST"        : "Item does not exist.",
    "MISSING_ID"                : "Identifier not specified.",
    "MISSING_CONN_STR"          : "Missing connStr (connection string) argument."
};

module.exports = strings;

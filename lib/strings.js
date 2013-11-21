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
    "MISSING_CONN_STR"          : "Missing connStr (connection string) argument.",
    "MISSING_CONF_PROV"         : "Cofiguration provider must be specified (config.provider).",
    "MISSING_CONF_FOR_ENV"      : "There is no configuration for environment \"%s\".",
    "NO_PROVIDERS"              : "No providers configured for environment \"%s\". "
};

module.exports = strings;

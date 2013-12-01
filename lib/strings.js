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
    "NO_PROVIDERS"              : "No providers configured for environment \"%s\". ",
    "DEF_MAN_INITED"            : "The default manager is already initialized.",
    "REQUIRED_CALLBACK"         : "Callback function is required.",
    "MISSING_PROV_ARGS"         : "Missing provider arguments. The minimum required arguments are: Provider({ connStr: \"someConnection\" }, { __collName: \"collectionName\" });",
    "PROVIDER_EXISTS"           : "A provider with the name of \"%s\" is already registered.",
    "NO_SUCH_PROVIDER"          : "A provider with the name of \"%s\" has not been registered."
};

module.exports = strings;

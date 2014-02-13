/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

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
    "MISSING_PROV_ARGS"         : "Missing provider arguments. The minimum required arguments are: Provider({ connStr: \"database connection string\" });",
    "PROVIDER_EXISTS"           : "A collection with the name of \"%s\" is already registered.",
    "CONN_EXISTS"               : "A connection with the name of \"%s\" is already registered.",
    "NO_SUCH_PROVIDER"          : "A collection with the name of \"%s\" has not been registered.",
    "NO_SUCH_CONN"              : "A connection with the name of \"%s\" has not been registered.",
    "ERR_ALREADY_INIT"          : "Entree is already initialized. If you want to override the current setup provide replace argument.",
    "UNSUP_MAP_TYPE"            : "Unsuported mapping type.",
    "NO_CONF_FILE"              : "The specified configuration document doesn't exist.",
    "MISSING_CONFIG"            : "Missing configuration. A configuration object should be provided to init method or alternatively a configuration file should be present at the following default location: \"./data/config/dataModel.json\".",
    "MISSING_CONF_PARAMS"       : "When config is specified, all its parameters are required. Pleas see Manager.init documentation.",
    "SCHEMA_EXISTS"             : "A schema with the name of \"%s\" is already registered.",
    "NO_SUCH_SCHEMA"            : "A schema with the name of \"%s\" has not been registered.",
    "REQUIRED_NAME_PROP"        : "\"name\" property is required for %s object.",
    "REQUIRED_SCHEMA_NAME"      : "\"__name__\" property is required when setting schema object.",
    "ERR_COLLS_ARG"             : "The argument colls must be an Array of strings and must have length of at least two elements."
};

module.exports = strings;

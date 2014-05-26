"use strict";

var Err         = require("./error"),
    Context     = require("./context"),
    Strings     = require("../strings"),
    _           = require("lodash");

require("./string");

function validateKeys(data, idKey) {
    var keys = Object.keys(data),
        type;

    keys.every(function (el) {
        if (el === idKey) {
            return true;
        }
        if (el.startsWith("$")) {
            if (type === "fields") {
                type = "mixed";
                return false;
            }
            type = "opers";
        } else {
            if (type === "opers") {
                type = "mixed";
                return false;
            }
            type = "fields";
        }
        return true;
    });
    return type;
}

function index(obj, idx, value) {
    if (typeof idx === "string") {
        return index(obj, idx.split("."), value);
    } else if (idx.length === 1 && value !== undefined) {
        return (obj[idx[0]] = value);
    } else if (idx.length === 0) {
        return obj;
    } else {
        var val = obj[idx[0]];
        if (!val) {
            if (value === undefined) {
                return undefined;
            }
            obj[idx[0]] = val = {};
        }
        return index(val, idx.slice(1), value);
    }
}

function update(data, trg, insert, idKey) {
    if (typeof insert === "string") {
        idKey = insert;
        insert = null;
    }

    var id,
        itm,
        set,
        type = validateKeys(data, idKey);

    if (type === "mixed") {
        throw new Err("INVALID_FIELD_NAME");
    }
    if (type === "fields") {
        return data;
    }
    if (idKey) {
        if (data.$set && data.$set[idKey]) {
            id = data[idKey];
            set = true;
            delete data.$set[idKey];
        }
        if (data[idKey]) {
            id = data[idKey];
            itm = true;
            delete data[idKey];
        }
    }

    if (insert && data.$setOnInsert) {
        _.merge(trg, data.$setOnInsert);
    }

    if (data.$set) {
        _.merge(trg, data.$set);
    }

    if (data.$inc) {
        _.reduce(data.$inc, function (res, val, key) {
            var orgVal = index(trg, key);
            if (orgVal) {
                val = orgVal + val;
            }
            index(trg, key, val);
            return trg;
        }, trg);
    }

    if (itm) {
        data[idKey] = id;
    }
    if (set) {
        data.$set[idKey] = id;
    }

    return trg;
}

function validateArgs(args, name) {
    var res = {};
    if (args.length === 1) {
        res.item = args[0];
    } else if (args.length === 2) {
        if (typeof args[1] === "function") {
            res.item = args[0];
            res.callback = args[1];
        } else {
            res.context = args[0];
            res.item = args[1];
        }
    } else if (args.length > 2) {
        res.context = args[0];
        res.item = args[1];
        res.callback = args[2];
    }

    if (!res.callback) {
        res.callback = function () {};
    }

    if (!res.item) {
        return res.callback(new Err(Strings.MISSING_ARG, name));
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

function validateSelectArgs(args) {
    var res = {},
        val;

    switch (args.length) {
    case 4:
        res.context = args[0];
        res.query = args[1];
        res.options = args[2];
        res.callback = args[3];
        break;
    case 3:
        if (args[0] instanceof Context) {
            res.context = args[0];
            res.query = args[1];
            if (_.isFunction(args[2])) {
                res.callback = args[2];
            } else {
                res.options = args[2];
            }
        } else {
            res.query = args[0];
            res.options = args[1];
            res.callback = args[2];
        }
        break;
    case 2:
        if (args[0] instanceof Context) {
            res.context = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.query = args[1];
            }
        } else {
            res.query = args[0];
            if (_.isFunction(args[1])) {
                res.callback = args[1];
            } else {
                res.options = args[1];
            }
        }
        break;
    case 1:
        val = args[0];
        if (val instanceof Context) {
            res.context = val;
        } else if (typeof val === "function") {
            res.callback = val;
        } else {
            res.query = val;
        }
        break;
    }

    if (res.context && res.context.__orgObj) {
        res.context = res.context.__orgObj;
    }

    return res;
}

exports.update = update;
exports.validateKeys = validateKeys;
exports.index = index;
exports.validateArgs = validateArgs;
exports.validateSelectArgs = validateSelectArgs;

/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

var Cursor      = require("../../lib/cursor"),
    util        = require("util"),
    sift        = require("sift");

function CursorMock(provider, query, projection, options) {
    Cursor.call(this, provider, query, projection, options);
    
    this.current = 0;
    if (this.query) {
        this.sifter = sift(this.query);
    }
}

util.inherits(CursorMock, Cursor);

CursorMock.prototype._isMatch = function (item) {
    if (this.sifter) {
        return this.sifter.test(item);
    }
    return true;
};

CursorMock.prototype._project = function (item) {
    
};

CursorMock.prototype._nextObject = function (callback) {
    "use strict";
    
    process.nextTick(function () {
        var item = this.provider.store[this.current++];
        while (item) {
            if (this._isMatch(item)) {
                break;
            }
            item = this.provider.store[this.current++];
        }
        
        if (this.projection) {
            item = this._project(item);
        }
        callback(null, item, false);
    });
};
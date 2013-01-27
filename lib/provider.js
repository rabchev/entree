/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, sloppy: true, es5: true, indent: 4, maxerr: 50 */
/*global require, exports, module */

function Provider(connStr, options) {
    "use strict";
    
    this.connectionString   = connStr;
    this.options            = options || {};
    this.statck             = [];
}

Provider.prototype.insert = function (obj, callback) {
    "use strict";
    
};

Provider.prototype.update = function (obj, callback) {
    "use strict";
    
};

Provider.prototype.delete = function (obj, callback) {
    "use strict";
    
};

Provider.prototype.get = function (obj, callback) {
    "use strict";
    
};

Provider.prototype.select = function (query, sort, template, callback) {
    "use strict";
    
};

module.exports = exports = Provider;
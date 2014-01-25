/*jslint plusplus: true, devel: true, nomen: true, vars: true, node: true, es5: true, indent: 4, maxerr: 50 */

"use strict";

var entree      = require("entree"),
    authority   = require("authority"),
    opts        = {
        model:  {
            providers: [{
                "provider": "file-system",
                "options": {
                    "connStr": "./data"
                },
                "collections": [
                    { "name": "blogs" }
                ]
            }]
        }
    };

entree.init(opts, function (err) {

});

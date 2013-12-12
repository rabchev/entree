/*jslint plusplus: true, devel: true, nomen: true, node: true, indent: 4, maxerr: 50 */

"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        jsdoc : {
            dist : {
                src     : ["./lib"],
                options: {
                    destination     : "./docs/",
                    configure       : "./jsdoc.json"
                }
            }
        },
        test: {
            all         : "",
            fileSys     : "",
            mongo       : "",
            everlive    : "",
            manager     : "",
            entree      : "",
            cache       : ""
        },
        nodeunit: {
            all         : ["*_test.js"],
            fileSys     : ["file-system_test.js", "fs-common_test.js"],
            mongo       : ["mo-common_test.js"],
            everlive    : ["el-common_test.js"],
            manager     : ["manager_test.js"],
            entree      : ["entree_test.js"],
            cache       : ["cache_test.js"]
        }
    });

    grunt.loadNpmTasks("grunt-release");
    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    grunt.registerMultiTask("test", function () {
        process.chdir("test");
        grunt.task.run(["nodeunit:" + this.target]);
    });
};

/*jslint plusplus: true, devel: true, nomen: true, node: true, indent: 4, maxerr: 50 */

"use strict";

module.exports = function (grunt) {
    var globalConfig = {};

    grunt.initConfig({
        globalConfig: globalConfig,
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
            mongodb     : "",
            everlive    : "",
            manager     : "",
            entree      : "",
            cache       : ""
        },
        nodeunit: {
            all         : ["*_test.js"],
            fileSys     : ["file-system_test.js", "fs-spec_test.js"],
            mongodb     : ["mongodb_test.js"],
            everlive    : ["everlive_test.js"],
            manager     : ["manager_test.js"],
            entree      : ["entree_test.js"],
            cache       : ["cache_test.js"]
        },
        shell: {
            debugtest: {
                options: {
                    stdout      : true
                },
                command         : "node --debug-brk $(which grunt) test:<%= globalConfig.target %>"
            }
        },
        "node-inspector"        : {
            "default"               : {}
        }
    });

    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-release");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-node-inspector");

    grunt.registerMultiTask("test", function () {
        process.chdir("test");
        grunt.task.run(["nodeunit:" + this.target]);
    });

    grunt.registerTask("test-debug", function () {
        process.chdir("test");
        globalConfig.target = this.args[0];
        grunt.task.run(["node-inspector", "shell:debugtest"]);
    });
};

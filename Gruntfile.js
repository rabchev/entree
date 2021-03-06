/*jslint plusplus: true, devel: true, nomen: true, node: true, indent: 4, maxerr: 50 */

"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        jsdoc: {
            dist: {
                src: ["./lib", "README.md"],
                options: {
                    destination: "./cache/docs",
                    tutorials: "./cache/docs/tutorials",
                    template: "./node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
                    configure: "./jsdoc.json"
                }
            }
        },
        "gh-pages": {
            options: {
                base: "./cache/docs"
            },
            src: ["**"]
        },
        nodeunit: {
            all: ["*_test.js"],
            sanity: [
                "provider-base_test.js",
                "file-system_test.js",
                "fs-spec_test.js",
                "mongodb_test.js",
                "manager_test.js",
                "entree_test.js",
                "cache_test.js",
                "logging_test.js",
                "autofields_test.js",
                "transaction_test.js",
                "replica_test.js"
            ],
            base: ["provider-base_test.js"],
            fileSys: ["file-system_test.js", "fs-spec_test.js"],
            mongodb: ["mongodb_test.js"],
            everlive: ["everlive_test.js"],
            manager: ["manager_test.js"],
            entree: ["entree_test.js"],
            cache: ["cache_test.js"],
            logging: ["logging_test.js"],
            autofields: ["autofields_test.js"],
            transaction: ["transaction_test.js"],
            replica: ["replica_test.js"]
        },
        shell: {
            debug: {
                options: {
                    stdout: true
                },
                command: function (target) {
                    if (process.platform === "win32") {
                        return "grunt-debug test:" + target;
                    }

                    return "node --debug-brk $(which grunt) test:" + target;
                }
            }
        },
        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            debug_all: ["node-inspector", "shell:debug:all"],
            debug_base: ["node-inspector", "shell:debug:base"],
            debug_fileSys: ["node-inspector", "shell:debug:fileSys"],
            debug_mongodb: ["node-inspector", "shell:debug:mongodb"],
            debug_everlive: ["node-inspector", "shell:debug:everlive"],
            debug_manager: ["node-inspector", "shell:debug:manager"],
            debug_entree: ["node-inspector", "shell:debug:entree"],
            debug_cache: ["node-inspector", "shell:debug:cache"],
            debug_logging: ["node-inspector", "shell:debug:logging"],
            debug_autofields: ["node-inspector", "shell:debug:autofields"],
            debug_transaction: ["node-inspector", "shell:debug:transaction"],
            debug_replica: ["node-inspector", "shell:debug:replica"]
        },
        "node-inspector": {
            "default": {}
        },
        release: {
            options: {
                npm: false
            }
        }
    });

    grunt.loadNpmTasks("grunt-jsdoc");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-release");
    grunt.loadNpmTasks("grunt-concurrent");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
    grunt.loadNpmTasks("grunt-node-inspector");
    grunt.loadNpmTasks("grunt-gh-pages");

    grunt.registerTask("test", function () {
        var arg = "all";
        if (this.args && this.args.length > 0) {
            arg = this.args[0];
        }
        process.chdir("test");
        grunt.task.run(["nodeunit:" + arg]);
    });

    grunt.registerTask("test-debug", function () {
        var arg = "all";
        if (this.args && this.args.length > 0) {
            arg = this.args[0];
        }
        process.chdir("test");
        grunt.task.run(["concurrent:debug_" + arg]);
    });

    grunt.registerTask("docs", ["jsdoc", "gh-pages"]);
};

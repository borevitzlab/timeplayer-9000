/*
Closure compiler gruntfile.
 */

var compilerPackage = require('google-closure-compiler');
module.exports = function(grunt) {
    compilerPackage.grunt(grunt);

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'closure-compiler': {
            target: {
                files: {
                    'dist/timeplayer-9000.cc.min.js': ['build/rolled.js']
                },
                options: {
                    generate_exports: true,
                    // TODO: we need to transpile to ECMASCRIPT5 to use ADVANCED.
                    compilation_level: 'SIMPLE',
                    language_in: 'ECMASCRIPT6',
                    language_out: 'ECMASCRIPT5',
                    create_source_map: 'dist/timeplayer-9000.cc.min.js.map'
                }
            }
        }
    });
    grunt.registerTask('default', ['closure-compiler']);
};

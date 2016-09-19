/* eslint-disable no-console */

var gulp = require('gulp');
var shellton = require('shellton');
var argv = require('yargs').argv;

gulp.task('exec', function(done) {
    console.log('executing:', argv.exec);
    
    shellton.spawn(argv.exec, function(err, stdout, stderr) {
        if (err) {
            console.error(err);
        } else {
            console.log(stdout);
            console.error(stderr);
        }
        
        done();
    });
});

gulp.task('watch', function() {
    console.log('watching:', argv.pattern);
    
    gulp.watch(argv.pattern, ['exec']);
});

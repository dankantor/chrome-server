var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('gulp-browserify');
var less = require('gulp-less');
var path = require('path');
var imagemin = require('gulp-imagemin');
var htmlmin = require('gulp-htmlmin');
var fs = require('fs');
var awspublish = require('gulp-awspublish');
var notify = require("gulp-notify");


// browserify js and template files
// only need index file
// requires get pulled in automatically
gulp.task('browserify-background', function() {
    gulp.src('./src/background/js/index.js')
        .pipe(browserify
            ({
                'insertGlobals': true,
                'debug': gutil.env.production,
                'transform': ['hbsfy']
            })
            .on('error', notify.onError(
                function (error) {
                    return error.message;
                }
            ))
        )
        .pipe(gulp.dest('./build/background/js'))
});

// browserify js and template files
// only need index file
// requires get pulled in automatically
gulp.task('browserify-options', function() {
    gulp.src('./src/options/js/index.js')
        .pipe(browserify
            ({
                'insertGlobals': true,
                'debug': gutil.env.production,
                'transform': ['hbsfy']
            })
            .on('error', notify.onError(
                function (error) {
                    return error.message;
                }
            ))
        )
        .pipe(gulp.dest('./build/options/js'))
});

// convert less files to css
// only need index file
// imports get pulled in automatically
gulp.task('less', function () {
  gulp
    .src('./src/options/less/index.less')
    .pipe(less({
      paths: ['src/options/less']
    }))
    .pipe(gulp.dest('./build/options/css'));
});

// minify images
// put them in build folder
gulp.task('imagemin-background', function () {
    gulp.src('src/background/images/**')
        .pipe(imagemin())
        .pipe(gulp.dest('./build/background/images'));
});

// minify images
// put them in build folder
gulp.task('imagemin-options', function () {
    gulp.src('src/options/images/**')
        .pipe(imagemin())
        .pipe(gulp.dest('./build/options/images'));
}); 

// minify html
// put it in build folder
gulp.task('htmlmin', function() {
  gulp.src('./src/options/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./build/options/'))
});


// copy chrome files
gulp.task('chromecopy', function () {
    gulp.src(
        './chrome/**/', 
        {base: './chrome'}
    )
    .pipe(gulp.dest('./build')); 
    
});


// build all one time
gulp.task('build',
    [
        'browserify-background',
        'browserify-options',
        'less',
        'imagemin-background',
        'imagemin-options',
        'htmlmin',
        'chromecopy'
    ]
);

// watch files for changes
// js & templates -> browserify
// less -> less
gulp.task('watch', function () {
    gulp.watch('src/background/js/**', ['browserify-background']);
    gulp.watch('src/options/js/**', ['browserify-options']);
    gulp.watch('src/options/templates/**', ['browserify-options']);
    gulp.watch('src/common/js/**', ['browserify-background']);
    gulp.watch('src/common/js/**', ['browserify-options']);
    gulp.watch('src/options/less/**', ['less']);
    gulp.watch('src/background/images/**', ['imagemin-background']);
    gulp.watch('src/options/images/**', ['imagemin-options']);
    gulp.watch('src/options/*.html', ['htmlmin']);
    gulp.watch('src/options/fonts/**', ['fontcopy']);
    gulp.watch('chrome/**', ['chromecopy']);
});




// watching files
// building js with browserify
// adding handlebars templates
// building less into css
// image min
// html min
// add jquery, backbone, underscore
// deploy to aws


//todo
// partials on templates
// dev vs prod for uglifying, source maps, banners
// build html5 manifest file



// example how to do 2 destinations

//gulp.task('styles', function() {
  //return gulp.src('src/styles/main.scss')
    //.pipe(sass({ style: 'expanded' }))
    //.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    //.pipe(gulp.dest('dist/assets/css'))
    //.pipe(rename({suffix: '.min'}))
    //.pipe(minifycss())
    //.pipe(gulp.dest('dist/assets/css'))
    //.pipe(livereload(server))
    //.pipe(notify({ message: 'Styles task complete' }));
//});

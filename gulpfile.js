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
gulp.task('browserify', function() {
    gulp.src('./src/js/index.js')
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
        .pipe(gulp.dest('./build/js'))
});

// convert less files to css
// only need index file
// imports get pulled in automatically
gulp.task('less', function () {
  gulp
    .src('./src/less/index.less')
    .pipe(less({
      paths: ['src/less']
    }))
    .pipe(gulp.dest('./build/css'));
});

// minify images
// put them in build folder
gulp.task('imagemin', function () {
    gulp.src('src/images/**')
        .pipe(imagemin())
        .pipe(gulp.dest('./build/images'));
}); 

// minify html
// put it in build folder
gulp.task('htmlmin', function() {
  gulp.src('./src/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./build'))
});

// copy fonts to build dir
gulp.task('fontcopy', function () {
    gulp.src(
        './src/fonts/**/', 
        {base: './src/fonts'}
    )
    .pipe(gulp.dest('./build/fonts/')); 
    
});

// deploy to S3 bucket
gulp.task('deploy', function () {
    var aws = JSON.parse(fs.readFileSync('./aws.json'));
    var publisher = awspublish.create(aws);
    var headers = { 'Cache-Control': 'max-age=315360000, no-transform, public' };
    var js = gulp.src('./build/**')
        .pipe(publisher.publish(headers))
        .pipe(awspublish.reporter());
});


// build all one time
gulp.task('build',
    [
        'browserify',
        'less',
        'imagemin',
        'htmlmin',
        'fontcopy'
    ]
);

// watch files for changes
// js & templates -> browserify
// less -> less
gulp.task('watch', function () {
    gulp.watch('src/js/**', ['browserify']);
    gulp.watch('src/templates/**', ['browserify']);
    gulp.watch('src/less/**', ['less']);
    gulp.watch('src/images/**', ['imagemin']);
    gulp.watch('src/*.html', ['htmlmin']);
    gulp.watch('src/fonts/**', ['fontcopy']);
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

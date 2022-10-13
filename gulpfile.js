const browsersync = require('browser-sync').create();
const cached = require('gulp-cached');
const cssnano = require('gulp-cssnano');
const del = require('del');
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const npmdist = require('gulp-npm-dist');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify');
const useref = require('gulp-useref-plus');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require("gulp-autoprefixer");
const sourcemaps = require("gulp-sourcemaps");
const cleanCSS = require('gulp-clean-css');
const rtlcss = require('gulp-rtlcss');

const paths = {
    base: {
        base: {
            dir: './'
        },
        node: {
            dir: './node_modules'
        },
        packageLock: {
            files: './package-lock.json'
        }
    },
    dist: {
        base: {
            dir: './dist',
            files: './public/**/*'
        },
        libs: {
            dir: './public/assets/libs'
        },
        css: {
            dir: './public/assets/css',
        },
        js: {
            dir: './public/assets/js',
            files: './public/assets/js/pages',
        },
    },
    src: {
        base: {
            dir: './public',
            files: './public/**/*'
        },
        css: {
            dir: './public/assets/css',
            files: './public/assets/css/**/*'
        },
        html: {
            dir: './public',
            files: './public/**/*.html',
        },
        img: {
            dir: './public/assets/images',
            files: './public/assets/images/**/*',
        },
        js: {
            dir: './public/assets/js',
            pages: './public/assets/js/pages',
            files: './public/assets/js/pages/*.js',
            main: './public/assets/js/*.js',
        },
        partials: {
            dir: './public/partials',
            files: './public/partials/**/*'
        },
        scss: {
            dir: './public/assets/scss',
            files: './public/assets/scss/**/*',
            main: './public/assets/scss/*.scss'
        }
    }
};

gulp.task('browsersync', function(callback) {
    browsersync.init({
        server: {
            baseDir: [paths.dist.base.dir, paths.src.base.dir, paths.base.base.dir]
        },
    });
    callback();
});

gulp.task('browsersyncReload', function(callback) {
    browsersync.reload();
    callback();
});

gulp.task('watch', function() {
    gulp.watch(paths.src.scss.files, gulp.series('scss', 'browsersyncReload'));
    gulp.watch([paths.src.js.dir], gulp.series('js', 'browsersyncReload'));
    // gulp.watch([paths.src.js.pages], gulp.series('jsPages','browsersyncReload'));
    gulp.watch([paths.src.html.files, paths.src.partials.files], gulp.series('fileinclude', 'browsersyncReload'));
});

gulp.task('js', function() {
    return gulp
        .src(paths.src.js.main)
        // .pipe(uglify())
        .pipe(gulp.dest(paths.dist.js.dir));
});

// gulp.task('jsPages', function() {
//   return gulp
//     .src(paths.src.js.files)
//     // .pipe(uglify())
//     .pipe(gulp.dest(paths.dist.js.files));
// });

gulp.task('scss', function() {
    // generate ltr  
    gulp
        .src(paths.src.scss.main)
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer()
        )
        .pipe(gulp.dest(paths.dist.css.dir))
        .pipe(cleanCSS())
        .pipe(
            rename({
                // 
                suffix: ".min"
            })
        )
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest(paths.dist.css.dir));

    // generate rtl
    return gulp
        .src(paths.src.scss.main)
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer()
        )
        .pipe(rtlcss())
        .pipe(gulp.dest(paths.dist.css.dir))
        .pipe(cleanCSS())
        .pipe(
            rename({
                // 
                suffix: "-rtl.min"
            })
        )
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest(paths.dist.css.dir));
});

gulp.task('fileinclude', function(callback) {
    return gulp
        .src([
            paths.src.html.files,
            '!' + paths.dist.base.files,
            '!' + paths.src.partials.files
        ])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file',
            indent: true,
        }))
        .pipe(cached())
        .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('clean:packageLock', function(callback) {
    del.sync(paths.base.packageLock.files);
    callback();
});

gulp.task('clean:dist', function(callback) {
    del.sync(paths.dist.base.dir);
    callback();
});

gulp.task('copy:all', function() {
    return gulp
        .src([
            paths.src.base.files,
            '!' + paths.src.partials.dir, '!' + paths.src.partials.files,
            '!' + paths.src.scss.dir, '!' + paths.src.scss.files,
            '!' + paths.src.js.dir, '!' + paths.src.js.files, '!' + paths.src.js.main,
            '!' + paths.src.html.files,
        ])
        .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('copy:libs', function() {
    return gulp
        .src(npmdist(), { base: paths.base.node.dir })
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(/\/public/, '').replace(/\\public/, '');
        }))
        .pipe(gulp.dest(paths.dist.libs.dir));
});

gulp.task('html', function() {
    return gulp
        .src([
            paths.src.html.files,
            '!' + paths.dist.base.files,
            '!' + paths.src.partials.files
        ])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file',
            indent: true,
        }))
        .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
        .pipe(replace(/public="(.{0,10})node_modules/g, 'src="$1assets/libs'))
        .pipe(useref())
        .pipe(cached())
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', cssnano({ svgo: false })))
        .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('build', gulp.series(gulp.parallel('clean:packageLock', 'clean:dist', 'copy:all', 'copy:libs'), 'fileinclude', 'js', 'scss', 'html'));

gulp.task('default', gulp.series(gulp.parallel('clean:packageLock', 'clean:dist', 'copy:all', 'copy:libs', 'fileinclude', 'js', 'scss', 'html'), gulp.parallel('browsersync', 'watch')));
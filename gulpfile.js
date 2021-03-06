var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var uglify = require('gulp-uglifyjs');
var webpack = require('gulp-webpack');
var usemin = require('gulp-usemin');
var minifyCss = require('gulp-minify-css');
var git = require('gulp-git');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var rename = require('gulp-rename');
var exec = require('child_process').exec;
var Q = require('q');

var paths = {
    src: [
        './src/core.js',
        './src/input.js',
        './src/graphics.js',
        './src/animation.js',
        './src/physics.js',        
        './src/sound.js'
    ],

    editor: ['editor/**/*.jsx', 'editor/**/*.js']
};

gulp.task('default', ['test']);
gulp.task('test', ['jscs', 'jshint']);
gulp.task('build', ['compress', 'build-editor']);

gulp.task('build-editor', function (done) {
    runSequence(
        'browserify',
        'usemin',
        'copy-glyphicons',
        done
    );
});

gulp.task('publish-docs', function (done) {
    runSequence(
        'clean-clone',
        'clone',
        'clean-clone-content',
        'build-editor',
        'mkdocs',
        'copy-doc',
        'copy-editor',
        'copy-build',
        'copy-demos',
        'commit',
        done
    );
});
gulp.task('start', ['watch']);

gulp.task('jscs', function() {
    return gulp.src('./src/*.js')
        .pipe(jscs());
});

gulp.task('jshint', function() {
    return gulp.src('./src/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default', { verbose: true }))
        .pipe(jshint.reporter('fail'));
});

gulp.task('compress', function() {
    gulp.src(paths.src)
        .pipe(uglify('micron.js', {
            output: {
                beautify: true
            },
            compress: false,
            mangle: false
        }))
        .pipe(gulp.dest('build'))
        .pipe(uglify('micron.min.js', {
            outSourceMap: true
        }))
        .pipe(gulp.dest('build'));

});

gulp.task('watch', function() {
    gulp.watch(paths.src, ['compress']);
    gulp.watch(paths.editor, ['build-editor']);
});

gulp.task('browserify', function() {
    return gulp.src('./editor/app/bootstrap.jsx')
        .pipe(webpack({
            module: {
                loaders: [
                    {
                        test: /\.jsx$/,
                        loader: 'jsx-loader?insertPragma=React.DOM&harmony'
                    }
                ]
            },
            output: {
                filename: 'app-bundled.js'
            }
        }))
        .pipe(gulp.dest('./editor'));
});

gulp.task('usemin', function () {
    return gulp.src('./editor/index_dev.html')
        .pipe(rename('index.html'))
        .pipe(usemin({
            css: [minifyCss(), 'concat']
        }))
        .pipe(gulp.dest('./editor'));
});

gulp.task('mkdocs', function (cb) {
    exec('mkdocs build --clean', function (err, stdout, stderr) {
        cb(err);
    })
});

gulp.task('clean-clone-content', function () {
    return gulp.src('micronjs.github.io/*', {read: false})
        .pipe(clean());
});

gulp.task('clean-clone', function () {
    return gulp.src('micronjs.github.io', {read: false})
        .pipe(clean());
});

gulp.task('clone', function () {
    var deferred = Q.defer(),
        baseUrl = 'https://github.com/micronjs';

    if (process.env.GH_TOKEN) {
        baseUrl = 'https://' + process.env.GH_TOKEN + '@github.com/micronjs';
    }

    git.clone(baseUrl + '/micronjs.github.io.git', function (err) {
        if (err) {
            return deferred.reject(err);
        }

        return deferred.resolve();
    });

    return deferred.promise;
});

gulp.task('commit', function () {
    function push () {
        var deferred = Q.defer();

        git.push('origin', 'master', { cwd: 'micronjs.github.io', args: " -f" }, function(err) {
            if (err) {
                return deferred.reject(err);
            }

            deferred.resolve();
        });

        return deferred.promise;
    }

    return gulp.src('micronjs.github.io/')
        .pipe(git.add({ cwd: 'micronjs.github.io' }))
        .pipe(git.commit('Update ' + (new Date), { cwd: 'micronjs.github.io', args: '--allow-empty --amend' }))
        .on('end', function () {
            push();
        });
});

gulp.task('copy-doc', function () {
    return gulp.src('site/**')
        .pipe(gulp.dest('micronjs.github.io'));
});

gulp.task('copy-build', function () {
    return gulp.src(['build/**'])
        .pipe(gulp.dest('micronjs.github.io/build'));
});

gulp.task('copy-demos', function () {
    return gulp.src(['demos/**'])
        .pipe(gulp.dest('micronjs.github.io/demos'));
});

gulp.task('copy-editor', function () {
    return gulp.src(['editor/**', '!editor/index_dev.html'])
        .pipe(gulp.dest('micronjs.github.io/editor'));
});

gulp.task('copy-glyphicons', function () {
    return gulp.src('node_modules/bootstrap/fonts/**')
        .pipe(gulp.dest('editor/fonts'));
});

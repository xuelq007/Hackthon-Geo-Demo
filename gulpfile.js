'use strict';

//////////////////////////////
// Requires
//////////////////////////////
const gulp = require('gulp');
const del = require('del');
const runSequence = require('run-sequence');
const concat = require('gulp-concat');
const newer = require('gulp-newer');
const minifyHTML = require('gulp-html-minifier');
const vulcanize = require('gulp-vulcanize');
const nodemon = require('gulp-nodemon');
const sourcemaps = require('gulp-sourcemaps');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const sass = require('gulp-sass');
const eyeglass = require('eyeglass');
const autoprefixer = require('gulp-autoprefixer');
const importOnce = require('node-sass-import-once');
const sasslint = require('gulp-sass-lint');
const imagemin = require('gulp-imagemin');
const cfenv = require('cfenv');
const gulpif = require('gulp-if');
const browserSync = require('browser-sync').create();

//////////////////////////////
// Variables
//////////////////////////////
const dirs = {
  js: {
    lint: {
      browser: [
        'src/**/*.js',
        '!src/**/*.min.js'
      ],
      node: [
        'index.js',
        'lib/**/*.js',
      ],
    },
    uglify: [
      'bower_components/webcomponentsjs/webcomponents-lite.js',
      'bower_components/geolocator/dist/geolocator.js',
      'src/js/**/*.js',
      '!src/js/**/*.min.js'
    ]
  },
  server: {
    main: 'index.js',
    watch: [
      'index.js',
      'lib',
      'views',
    ],
    extension: 'js html',
  },
  sass: 'src/sass/**/*.scss',
  images: 'src/images/**/*.*',
  components: 'src/polymer-components/',
  public: 'public/',
};

const isCI = (typeof process.env.CI !== 'undefined') ? Boolean(process.env.CI) : false;

const sassOptions = {
  'outputStyle': isCI ? 'expanded' : 'compressed',
};

const autoprefixerOptions = {
  browsers: ['> 1%', 'last 2 versions'],
  cascade: true,
  remove: true,
};

const vulcanOptions = {
  stripExcludes: false,
  excludes: [],
  inlineCss: true,
  inlineScripts: true,
};

const htmlOptions = {
  customAttrAssign: [/\$=/],
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  minifyJS: true,
  minifyCSS: true,
};

//////////////////////////////
// JavaScript Lint Tasks
//////////////////////////////
gulp.task('eslint', ['eslint:browser', 'eslint:node']);

gulp.task('eslint:browser', function () {
  return gulp.src(dirs.js.lint.browser)
    .pipe(eslint('./.eslintrc-browser.yml'))
    .pipe(eslint.format())
    .pipe(gulpif(isCI, eslint.failOnError()));
});

gulp.task('eslint:node', function () {
  return gulp.src(dirs.js.lint.node)
    .pipe(eslint('./.eslintrc-node.yml'))
    .pipe(eslint.format())
    .pipe(gulpif(isCI, eslint.failOnError()));
});

gulp.task('uglify', function () {
  return gulp.src(dirs.js.uglify)
    .pipe(gulpif(!isCI, sourcemaps.init()))
      .pipe(concat('app.js'))
      .pipe(uglify({
        'mangle': isCI ? true : false
      }))
    .pipe(gulpif(!isCI, sourcemaps.write('maps')))
    .pipe(gulp.dest(dirs.public + 'js'))
    .pipe(browserSync.stream());
});

gulp.task('eslint:watch', function () {
  return gulp.watch([dirs.js.lint.browser, dirs.js.lint.node], ['eslint']);
});

gulp.task('uglify:watch', function () {
  return gulp.watch(dirs.js.uglify, ['uglify']);
});

//////////////////////////////
// Sass Tasks
//////////////////////////////
gulp.task('sass', function () {
  return gulp.src(dirs.sass)
    .pipe(sasslint())
    .pipe(sasslint.format())
    .pipe(gulpif(isCI, sasslint.failOnError()))
    .pipe(gulpif(!isCI, sourcemaps.init()))
      .pipe(sass(eyeglass(sassOptions)))
      .pipe(autoprefixer(autoprefixerOptions))
    .pipe(gulpif(!isCI, sourcemaps.write('maps')))
    .pipe(gulp.dest(dirs.public + 'css'))
    .pipe(browserSync.stream());
});

gulp.task('sass:watch', function () {
  return gulp.watch(dirs.sass, ['sass']);
});

//////////////////////////////
// Image Tasks
//////////////////////////////
gulp.task('images', function () {
  return gulp.src(dirs.images)
    .pipe(imagemin({
      'progressive': true,
      'svgoPlugins': [
        { 'removeViewBox': false }
      ]
    }))
    .pipe(gulp.dest(dirs.public + '/images'));
});

gulp.task('images:watch', function () {
  return gulp.watch(dirs.images, ['images']);
});

//////////////////////////////
// Polymer Components Tasks
//////////////////////////////
gulp.task('components', ['components-copy'], function () {
  var files = dirs.public + 'polymer-components/**/*.html';

  if (!isCI) {
    return gulp.src(files)
      .pipe(browserSync.stream());
  } else {
    return gulp.src(files)
      .pipe(vulcanize(vulcanOptions))
      .pipe(minifyHTML(htmlOptions))
      .pipe(gulp.dest(dirs.public + 'polymer-components'));
  }
});

gulp.task('components:watch', function () {
  return gulp.watch(dirs.components + '**/*.*', ['components']);
});

gulp.task('components-css', function() {
  const files = [
    dirs.components + '/**/*.scss'
  ];

  const polymerSassOptions = {
    outputStyle: isCI ? 'expanded' : 'compressed',
    importer: importOnce,
    importOnce: {
      index: false,
      css: true,
      bower: false
    }
  };

  return gulp.src(files)
    .pipe(gulpif(!isCI, sourcemaps.init()))
    .pipe(sass(polymerSassOptions).on('error', sass.logError))
    .pipe(autoprefixer(autoprefixerOptions))
    .pipe(gulpif(!isCI, sourcemaps.write('maps')))
    .pipe(gulp.dest(dirs.public + 'polymer-components'))
    .pipe(browserSync.stream());
});

gulp.task('components-copy', ['components-css'], function () {
  const files = [
    dirs.components + '**/*',
    '!' + dirs.components + '**/*.scss'
  ];

  return gulp.src(files)
    .pipe(newer(dirs.public + 'polymer-components'))
    .pipe(gulp.dest(dirs.public + 'polymer-components'))
    .pipe(browserSync.stream());
});

gulp.task('components-lib', function () {
  const files = [
    './bower_components/**/*',
  ];

  return gulp.src(files)
    .pipe(gulp.dest(dirs.public + 'bower_components'));
});

//////////////////////////////
// Nodemon Task
//////////////////////////////
gulp.task('nodemon', function (cb) {
  nodemon({
    script: dirs.server.main,
    watch: dirs.server.watch,
    env: {
      'NODE_ENV': 'development'
    },
    ext: dirs.server.extension
  })
  .once('start', function () {
    cb();
  })
  .on('restart', function () {
    setTimeout(function () {
      browserSync.reload();
    }, 500);
  });
});

//////////////////////////////
// Browser Sync Task
//////////////////////////////
gulp.task('browser-sync', ['nodemon'], function () {
  const appEnv = cfenv.getAppEnv();

  browserSync.init({
    'proxy': appEnv.url
  });
});

//////////////////////////////
// Clean Task
//////////////////////////////
gulp.task('clean', function (cb) {
  return del([
    'public/**/*'
  ], cb);
});

//////////////////////////////
// Running Tasks
//////////////////////////////
gulp.task('build', function (cb) {
  runSequence('clean', ['uglify', 'sass', 'images', 'components-copy', 'components-lib', 'components'], cb);
});

gulp.task('test', ['build']);

gulp.task('watch', ['eslint:watch', 'uglify:watch', 'sass:watch', 'images:watch', 'components:watch']);

gulp.task('default', ['browser-sync', 'build', 'watch']);

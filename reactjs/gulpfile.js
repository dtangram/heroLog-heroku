const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');

// SASS Styles Task
gulp.task('stylesSCSS', () => gulp.src('./src/sass/main.scss')
  .pipe(sass({
    style: 'expanded',
  }))
  .pipe(plumber())
  .pipe(gulp.dest('./src/css/')));

// Watch Tasks
gulp.task('watch', () => {
  gulp.watch('./src/sass/base/base.scss', ['stylesSCSS']);
});

gulp.task('default', ['watch', 'stylesSCSS']);

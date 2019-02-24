const gulp = require('gulp');

gulp.task('default', build);

function build() {
  return gulp.src('src/**/*').pipe(gulp.dest('public/'));
}

module.exports = {
  root: true,
  extends: [require.resolve('@propieya/config/eslint/base.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

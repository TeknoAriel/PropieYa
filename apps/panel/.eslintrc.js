module.exports = {
  root: true,
  extends: [require.resolve('@propieya/config/eslint/next.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

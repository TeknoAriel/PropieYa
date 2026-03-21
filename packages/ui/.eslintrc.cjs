module.exports = {
  root: true,
  extends: [require.resolve('@propieya/config/eslint/react-internal.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

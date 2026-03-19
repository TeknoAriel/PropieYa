module.exports = {
  root: true,
  extends: ['@propieya/config/eslint/next.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

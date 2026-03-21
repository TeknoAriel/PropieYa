const path = require('path')

module.exports = {
  root: true,
  extends: [path.resolve(__dirname, '../../packages/config/eslint/next.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

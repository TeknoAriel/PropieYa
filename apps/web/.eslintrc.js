module.exports = {
  root: true,
  // require.resolve: Next/ESLint no resuelve bien el subpath del workspace sin ruta absoluta
  extends: [require.resolve('@propieya/config/eslint/next.js')],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}

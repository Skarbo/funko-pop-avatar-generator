module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      legacyDecorators: true
    }
  },
  extends: ['eslint:recommended'],
  rules: {
    'semi': [2, 'never'],
    'no-mixed-operators': 'off',
    'brace-style': ['error', 'stroustrup'],
    'strict': ['error', 'never'],
    'comma-dangle': ['error', 'only-multiline'],
    'no-unused-vars': ['error']
  }
}

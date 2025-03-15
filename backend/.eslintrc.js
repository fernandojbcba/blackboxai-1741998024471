module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Reglas personalizadas
    'no-console': ['error', { allow: ['log', 'error', 'warn'] }],
    'max-len': ['error', { code: 120 }],
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'no-underscore-dangle': 'off',
    'camelcase': 'off',
    'class-methods-use-this': 'off',
    
    // Reglas específicas para el proyecto
    'import/no-unresolved': 'error',
    'import/extensions': ['error', 'never'],
    'import/prefer-default-export': 'off',
    
    // Reglas para manejo de errores
    'no-throw-literal': 'off',
    'no-param-reassign': ['error', { props: false }],
    
    // Reglas para async/await
    'no-return-await': 'off',
    'no-await-in-loop': 'off',
    
    // Reglas para objetos y arrays
    'object-curly-newline': ['error', {
      ObjectExpression: { minProperties: 4, multiline: true, consistent: true },
      ObjectPattern: { minProperties: 4, multiline: true, consistent: true },
      ImportDeclaration: { minProperties: 4, multiline: true, consistent: true },
      ExportDeclaration: { minProperties: 4, multiline: true, consistent: true },
    }],
    'array-bracket-newline': ['error', { multiline: true }],
    
    // Reglas para promesas
    'prefer-promise-reject-errors': 'off',
    
    // Reglas para comentarios
    'spaced-comment': ['error', 'always', {
      line: {
        markers: ['/'],
        exceptions: ['-', '+'],
      },
      block: {
        markers: ['!'],
        exceptions: ['*'],
        balanced: true,
      },
    }],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js'],
        paths: ['src'],
      },
    },
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};

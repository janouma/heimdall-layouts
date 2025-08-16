import eslintConfigStandard from 'eslint-config-standard'
import eslintConfigSvelte from 'eslint-plugin-svelte'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import'
import n from 'eslint-plugin-n'
import promise from 'eslint-plugin-promise'
import babelEslintParser from '@babel/eslint-parser'

const standard = structuredClone(eslintConfigStandard)

standard.languageOptions = {
  ...standard.parserOptions,

  globals: {
    ...globals.browser,
    ...globals.node,
    ...standard.globals
  }
}

standard.plugins = { import: importPlugin, n, promise }

delete standard.parserOptions
delete standard.globals
delete standard.env
delete standard.languageOptions.ecmaFeatures

const rawSvelteRecommandedRules = eslintConfigSvelte.configs.recommended
  .find(({ name }) => name === 'svelte:recommended:rules')

const svelteConfigs = eslintConfigSvelte.configs.recommended.filter(config => config !== rawSvelteRecommandedRules)

const svelteRecommandedRules = rawSvelteRecommandedRules && structuredClone(rawSvelteRecommandedRules)

if (svelteRecommandedRules) {
  svelteRecommandedRules.files = ['**/*.svelte']
}

export default [
  standard,
  ...svelteConfigs,
  svelteRecommandedRules,
  {
    files: ['**/*.svelte'],
    rules: {
      'import/first': 'off',
      'import/no-duplicates': 'off',
      'import/no-mutable-exports': 'off',
      'no-multiple-empty-lines': [
        'error',
        {
          max: 1,
          maxBOF: 2,
          maxEOF: 0
        }
      ]
    },
    processor: 'svelte/svelte'
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      parser: babelEslintParser
    }
  },
  {
    settings: {
      compileOptions: {
        customElement: true
      }
    }
  }
]

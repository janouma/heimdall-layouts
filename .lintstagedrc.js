export default {
  'src/**': 'npm run update-production-build',

  '{tests/**/*,lib/**/*,scripts/**/*,src/**/*,index,playwright.config}.{js,cjs,mjs,svelte}':
    'npm run lint --'
}

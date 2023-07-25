import browserSync from 'browser-sync'

browserSync({
  server: '.',

  https: {
    key: 'assets/ssl/key.pem',
    cert: 'assets/ssl/cert.pem'
  },

  port: process.env.npm_package_config_devPort,
  open: false,
  ui: false,
  cors: true,
  reloadDebounce: 2000,
  files: '{lib/**/*,layouts/**/*,tests/**/@(views|assets|helpers)/**/*,tests/*,index}.{js,cjs,mjs,html,css,png,jpg,svg}'
})

import browserSync from 'browser-sync'
import env from '../env.js'

browserSync({
  server: '.',

  https: {
    key: 'assets/ssl/key.pem',
    cert: 'assets/ssl/cert.pem'
  },

  ghostMode: false,
  port: env.port,
  open: false,
  ui: false,
  cors: true,
  reloadDebounce: 2500,
  files: '{lib/**/*,layouts/**/*,tests/**/@(views|assets|helpers)/**/*,tests/*,index}.{js,cjs,mjs,html,css,png,jpg,svg}'
})

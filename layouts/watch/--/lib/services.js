import logger from '../../../../packages/@byfrost/utils/logger.js'
import { flattenObject } from '../../../../.lib/juris/utils.js'
import juris from '../../../../.lib/juris/instance.js'

const log = logger.getLogger('layout/watch/lib/services')
const WATCH_STATE_KEY = `HdlWatchState_${Date.now()}_${String(performance.now()).replace('.', '_')}`

log.debug({ WATCH_STATE_KEY })

const layoutServices = {
  setLayoutState (key, value) {
    if (typeof key === 'object') {
      if (!value) {
        log.warn(`value ${JSON.stringify(value)} will be ignored`)
      }

      const flattenState = flattenObject(key)

      juris.executeBatch(() => {
        for (const [path, value] of flattenState) {
          juris.setState(`${WATCH_STATE_KEY}.${path}`, value)
        }
      })
    } else {
      juris.setState(`${WATCH_STATE_KEY}.${key}`, value)
    }
  },

  getLayoutState (key, defaultValue) {
    return key
      ? juris.getState(`${WATCH_STATE_KEY}.${key}`, defaultValue)
      : juris.getState(WATCH_STATE_KEY, defaultValue)
  },

  layoutSubscribe (key, listener) {
    return juris.subscribe(`${WATCH_STATE_KEY}.${key}`, listener)
  },

  getPlaylists: () => Object.entries(layoutServices.getLayoutState('config.playlists', {}))
    .filter(
      ([, list]) =>
        list?.[layoutServices.getLayoutState('itemType')]?.length > 0
    )
    .map(([name]) => name)
}

juris.services.HdlWatch = layoutServices

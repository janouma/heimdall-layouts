import 'dayjs'
import 'dayjs/plugin/duration.js'

const { dayjs, dayjs_plugin_duration: duration } = window
dayjs.extend(duration)

export default dayjs

import { gererateId } from './utils.js'

function updateFromV0ToV1 (config) {
  return {
    ...config,

    pined: config.pined?.map(workspace => ({
      id: gererateId(workspace),
      title: workspace,

      search: {
        workspace,
        includeDraft: true
      }
    }))
  }
}

export default [updateFromV0ToV1]

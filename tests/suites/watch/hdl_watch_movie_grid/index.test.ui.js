import { test, expect, getPaddedBoundingBox, addPaddingToBox } from '../../../helpers/playwright.js'
import { getComponentHelpers } from '../../../helpers/components.js'
import fixtureItems from '../../../fixtures/watch/items.json' with { type: 'json' }
import '../../../helpers/polyfill.js'

const layout = 'watch'
const component = 'movie_grid'

const {
  getComponentUrl,
  getScreenshotPath,
  tag
} = getComponentHelpers({ layout, component })

// dracula (watching), vanished, high_to_lowest, ballerina, jurassic_world_renaissance (watched)
const items = fixtureItems.slice(0, 5)

const noPosterItem = {
  $id: 'no_poster',
  title: 'No poster',
  url: 'https://tmdb/no_poster',
  snapshot: null
}

test('default display', async ({ page }) => {
  await page.goto(getComponentUrl())
  const movieGridChildren = page.locator('.movie-grid > *')
  return expect(movieGridChildren).toHaveCount(0)
})

test('filled', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { fillLimit: 50 } }))
  await expect(page).toHaveScreenshot(getScreenshotPath('filled'))

  page.setViewportSize({ width: 812, height: 667 })
  await expect(page).toHaveScreenshot(getScreenshotPath('filled-mini-screen'))

  page.setViewportSize({ width: 350, height: 667 })
  return expect(page).toHaveScreenshot(getScreenshotPath('filled-nano-screen'))
})

test('load failure', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'cannot simulate images load failure on webkit')
  const { promise: loadImageGate, resolve: finishImageLoad } = Promise.withResolvers()

  await page.route('https://unknown_url/*', async route => {
    await loadImageGate

    route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'Not Found!'
    })
  })

  page.goto(
    getComponentUrl({
      params: {
        items: items.map(item => ({
          ...item,
          snapshot: 'https://unknown_url/' + item.$id
        }))
      }
    })
  )

  const movieGrid = page.locator(tag)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('loading-posters'))

  finishImageLoad()
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('wrong-snapshots-posters'))

  await movieGrid.evaluate(
    (element, updatedItems) => { element.items = updatedItems },
    [...items, noPosterItem]
  )

  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('posters'))
})

test('posters display', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items: [...items, noPosterItem] } }))

  for (const item of items) {
    const poster = getPoster(page, item.$id)
    const image = poster.locator('.poster-visual')

    await expect(poster).toHaveAttribute('title', item.title)
    await expect(image).toHaveAttribute('alt', item.title)
  }

  const noPoster = getPoster(page, 'no_poster')
  const noPosterImage = noPoster.locator('.poster-visual')
  await expect(noPoster).toHaveAttribute('title', noPosterItem.title)
  await expect(noPosterImage).toHaveAttribute('alt', noPosterItem.title)

  const movieGrid = page.locator(tag)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('posters'))

  {
    const poster = getPoster(page, 'high_to_lowest')
    await poster.hover()
  }

  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('hovered-poster'))
})

test('detail event emission on poster selection', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))
  await trackDetailEvents(page)

  await getPoster(page, 'vanished').click()

  const [, vanishedPoster] = items
  expect(await getDetailEvents(page)).toEqual([vanishedPoster])
  expect(await page.evaluate(() => window.testContext.bodyReceivedDetail)).toBeFalsy()
})

test('item removal', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))

  await setLayoutState(page, {
    itemType: 'movie',
    searchMode: 'find',

    'config.playlists': {
      rewatch: { movie: items.map(({ $id }) => $id) },
      favorites: { movie: ['luther_fallen_sun'] }
    }
  })

  await trackDetailEvents(page)

  const { promise: removalGate, resolve: fulfillRemoval } = Promise.withResolvers()
  const removalPaths = []

  await page.route('/api/remove-item/*', async route => {
    removalPaths.push(new URL(route.request().url()).pathname)
    await removalGate
    return route.fulfill({ json: {} })
  })

  const sentConfigs = []

  await page.route('/api/set-config/watch', route => {
    sentConfigs.push(route.request().postDataJSON())
    return route.fulfill({ json: {} })
  })

  const poster = getPoster(page, 'dracula')
  const deleteButton = poster.getByTitle('Delete', { exact: true })

  await poster.hover()

  // force needed: the poster ::after overlay intercepts pointer events,
  // the component resolves hits by coordinates
  await deleteButton.click({ force: true })
  await expect(poster).toHaveScreenshot(getScreenshotPath('removal-confirmation'))

  await poster.getByTitle('Confirm delete', { exact: true }).click({ force: true })
  await expect(poster).toHaveClass(/pending/)
  await expect(poster).toHaveScreenshot(getScreenshotPath('after-removal'))

  fulfillRemoval()

  await expect(poster).not.toHaveClass(/pending/)
  expect(removalPaths).toEqual(['/api/remove-item/dracula'])

  expect(sentConfigs).toEqual([{
    playlists: {
      rewatch: { movie: ['vanished', 'high_to_lowest', 'ballerina', 'jurassic_world_renaissance'] },
      favorites: { movie: ['luther_fallen_sun'] }
    }
  }])

  expect(await getDetailEvents(page)).toEqual([])
})

test('removal abort', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))
  await setLayoutState(page, { searchMode: 'find' })

  let removalCallCount = 0

  await page.route('/api/remove-item/*', route => {
    removalCallCount++
    return route.fulfill({ json: {} })
  })

  const poster = getPoster(page, 'dracula')
  await poster.hover()
  await poster.getByTitle('Delete', { exact: true }).click({ force: true })
  await poster.getByTitle('Abort delete', { exact: true }).click({ force: true })

  await expect(poster).toHaveScreenshot(getScreenshotPath('after-removal'))
  expect(removalCallCount).toBe(0)
})

test('removal confirmation auto hide', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))
  await setLayoutState(page, { searchMode: 'find' })

  const poster = getPoster(page, 'dracula')

  await poster.hover()
  await poster.getByTitle('Delete', { exact: true }).click({ force: true })
  await expect(poster).toHaveScreenshot(getScreenshotPath('removal-confirmation'))

  // the confirmation controls hide by themselves after 3s
  await page.waitForFunction(async () => {
    const { promise, resolve } = Promise.withResolvers()
    setTimeout(resolve, 3000)
    return promise
  })

  await expect(poster.locator('.confirm-delete')).not.toBeVisible({ timeout: 250 })
  return expect(poster).toHaveScreenshot(getScreenshotPath('after-removal'))
})

test('removal failure', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))
  await setLayoutState(page, { searchMode: 'find' })

  await page.route('/api/remove-item/*', route => route.fulfill({ status: 500 }))

  const poster = getPoster(page, 'dracula')

  await poster.hover()
  await poster.getByTitle('Delete', { exact: true }).click({ force: true })
  await poster.getByTitle('Confirm delete', { exact: true }).click({ force: true })
  await expect(poster).toHaveAttribute('title', 'Removal of "Dracula" failed')

  await expect(page).toHaveScreenshot(
    getScreenshotPath('removal-failure'),
    { clip: await getPaddedBoundingBox(poster) }
  )

  const movieGrid = page.locator(tag)

  // items update resets the failure state
  await movieGrid.evaluate(
    (element, updatedItems) => { element.items = updatedItems },
    [...items, noPosterItem]
  )

  await expect(poster).toHaveAttribute('title', 'Dracula')

  await page.mouse.move(0, 0)
  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('posters'))
})

test('posters reordering', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))

  const movieGrid = page.locator(tag)
  const dracula = getPoster(page, 'dracula')

  await expect(dracula).toHaveJSProperty('draggable', false)

  await setLayoutState(page, {
    itemType: 'movie',
    searchMode: 'find',
    selectedPlaylist: 'rewatch'
  })

  await expect(dracula).toHaveJSProperty('draggable', true)

  await setLayoutState(page, { searching: true })
  await expect(dracula).toHaveJSProperty('draggable', false)

  await setLayoutState(page, { searching: false })
  await expect(dracula).toHaveJSProperty('draggable', true)

  await expectPostersLoaded(page, items.length)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordering-initial'))

  const {
    promise: configUpdateGate,
    resolve: fulfillConfigUpdate
  } = Promise.withResolvers()

  const sentConfigs = []

  await page.route('/api/set-config/watch', async route => {
    sentConfigs.push(route.request().postDataJSON())
    await configUpdateGate
    return route.fulfill({ json: {} })
  })

  const target = getPoster(page, 'high_to_lowest')
  const { x, y, height } = await target.boundingBox()
  await dragPosterTo(dracula, target, { y: height - 5 })

  // the insertion line shows on the left edge of the drop target
  await expect(target).toHaveScreenshot(getScreenshotPath('drop-target'))

  await page.mouse.move(x, y + height + 150)
  await page.mouse.up()
  await page.mouse.move(0, 0)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordering-initial'))

  // the drag ghost is shifted to the bottom half of the drop target
  // so the insertion line remains visible
  await dragPosterTo(dracula, target, { y: height - 5 })
  await page.mouse.up()

  await expect(movieGrid.locator('.movie-grid.pending')).toBeVisible()

  const vanished = getPoster(page, 'vanished')
  await expect(vanished).toHaveJSProperty('draggable', false)

  fulfillConfigUpdate()
  await expect(movieGrid.locator('.movie-grid.pending')).toBeHidden()

  expect(sentConfigs).toEqual([{
    playlists: {
      rewatch: {
        movie: ['vanished', 'dracula', 'high_to_lowest', 'ballerina', 'jurassic_world_renaissance']
      }
    }
  }])

  await expect(vanished).toHaveJSProperty('draggable', true)

  await page.mouse.move(0, 0)
  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordered'))
})

test('poster reordering to last position', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))

  await setLayoutState(page, {
    itemType: 'movie',
    searchMode: 'find',
    selectedPlaylist: 'rewatch'
  })

  await expectPostersLoaded(page, items.length)

  const movieGrid = page.locator(tag)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordering-initial'))

  const sentConfigs = []

  await page.route('/api/set-config/watch', route => {
    sentConfigs.push(route.request().postDataJSON())
    return route.fulfill({ json: {} })
  })

  const lastPoster = getPoster(page, 'jurassic_world_renaissance')
  const { width, height } = await lastPoster.boundingBox()

  await dragPosterTo(getPoster(page, 'dracula'), lastPoster, { x: width * 0.9, y: height - 5 })

  // the insertion line shows on the right edge of the last drop target
  await expect(lastPoster).toHaveScreenshot(getScreenshotPath('drop-target-last'))
  await page.mouse.up()

  await expect.poll(() => sentConfigs).toEqual([{
    playlists: {
      rewatch: {
        movie: ['vanished', 'high_to_lowest', 'ballerina', 'jurassic_world_renaissance', 'dracula']
      }
    }
  }])

  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordered-last'))
})

test('reordering failure', async ({ page }) => {
  await page.goto(getComponentUrl({ params: { items } }))

  await setLayoutState(page, {
    itemType: 'movie',
    searchMode: 'find',
    selectedPlaylist: 'rewatch'
  })

  await expectPostersLoaded(page, items.length)

  const movieGrid = page.locator(tag)
  await expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordering-initial'))

  await page.route('/api/set-config/watch', route => route.fulfill({ status: 500 }))

  const target = getPoster(page, 'high_to_lowest')
  const { height } = await target.boundingBox()

  await dragPosterTo(getPoster(page, 'dracula'), target, { y: height - 5 })
  await expect(target).toHaveScreenshot(getScreenshotPath('drop-target'))
  await page.mouse.up()

  await expect(movieGrid.locator('.movie-grid')).toHaveAttribute('title', 'Update failed')

  // the screenshot also asserts the posters order rollback
  await page.mouse.move(0, 0)
  return expect(movieGrid).toHaveScreenshot(getScreenshotPath('reordering-failure'))
})

test.describe('on touch device', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,

    // FIXME: remove once the `touchMovlog` typo in packages/juris/juris.mini.js
    // (corrupted `touchMoved` flag in the touchend tap handler) is fixed
    allowedJSErrors: [/touchMovlog/]
  })

  test('long press delete control display', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { items } }))
    await setLayoutState(page, { searchMode: 'find' })
    await expectPostersLoaded(page, items.length)

    const draculaPoster = getPoster(page, 'dracula')
    const deleteButton = draculaPoster.getByTitle('Delete', { exact: true })

    {
      const touchStartPosition = getCenter(await draculaPoster.boundingBox())
      await dispatchTouch(draculaPoster, 'touchstart', touchStartPosition)

      await page.waitForFunction(async () => {
        const { promise, resolve } = Promise.withResolvers()
        setTimeout(resolve, 1500)
        return promise
      })

      await expect(draculaPoster).toHaveScreenshot(
        getScreenshotPath('with-touch-controls'),
        { timeout: 250 }
      )

      await dispatchTouch(draculaPoster, 'touchend', touchStartPosition)

      await expect(draculaPoster)
        .toHaveScreenshot(getScreenshotPath('with-touch-controls'))
    }

    const vanishedPoster = getPoster(page, 'vanished')

    {
      const touchStartPosition = getCenter(await vanishedPoster.boundingBox())
      await dispatchTouch(vanishedPoster, 'touchstart', touchStartPosition)
    }

    const movieGrid = page.locator(tag)
    await expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordering-initial'))

    {
      const touchStartPosition = getCenter(await draculaPoster.boundingBox())
      await dispatchTouch(draculaPoster, 'touchstart', touchStartPosition)
    }

    await deleteButton.waitFor()
    await deleteButton.tap({ force: true })
    return expect(draculaPoster).toHaveScreenshot(getScreenshotPath('touch-removal-confirmation'))
  })

  test('posters reordering by touch', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { items } }))

    await setLayoutState(page, {
      itemType: 'movie',
      searchMode: 'find',
      selectedPlaylist: 'rewatch'
    })

    await expectPostersLoaded(page, items.length)

    const movieGrid = page.locator(tag)
    await expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordering-initial'))

    const sentConfigs = []

    await page.route('/api/set-config/watch', route => {
      sentConfigs.push(route.request().postDataJSON())
      return route.fulfill({ json: {} })
    })

    const dracula = getPoster(page, 'dracula')
    const target = getPoster(page, 'high_to_lowest')

    const draculaBox = await dracula.boundingBox()
    await dispatchTouch(dracula, 'touchstart', getCenter(draculaBox))

    await page.waitForFunction(async () => {
      const { promise, resolve } = Promise.withResolvers()
      setTimeout(resolve, 1500)
      return promise
    })

    await expect(page)
      .toHaveScreenshot(
        getScreenshotPath('with-touch-drag-controls'),
        { clip: addPaddingToBox(draculaBox) }
      )

    const targetBoundingBox = await target.boundingBox()
    let dropPosition

    {
      const { x, y, width, height } = targetBoundingBox
      dropPosition = { x: x + width / 2, y: y + height - 5 }

      // the touch point is at the bottom of the drop target so the drag ghost
      // does not cover the insertion line
      await dispatchTouch(page.locator('body'), 'touchmove', dropPosition)
    }

    // the insertion line shows on the left edge of the drop target
    await expect(target).toHaveScreenshot(getScreenshotPath('touch-drop-target'))

    {
      const { x, y, width, height } = targetBoundingBox

      await dispatchTouch(
        page.locator('body'),
        'touchmove',
        { x: x + width + 175 / 2, y: y + height + 150 }
      )
    }

    await dispatchTouch(dracula, 'touchend')
    await expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordering-initial'))

    await dispatchTouch(dracula, 'touchstart', getCenter(draculaBox))

    await page.waitForFunction(async () => {
      const { promise, resolve } = Promise.withResolvers()
      setTimeout(resolve, 1500)
      return promise
    })

    await dispatchTouch(page.locator('body'), 'touchmove', dropPosition)
    await dispatchTouch(dracula, 'touchend')

    await expect.poll(() => sentConfigs).toEqual([{
      playlists: {
        rewatch: {
          movie: ['vanished', 'dracula', 'high_to_lowest', 'ballerina', 'jurassic_world_renaissance']
        }
      }
    }])

    return expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordered'))
  })

  test('poster reordering to last position by touch', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { items } }))

    await setLayoutState(page, {
      itemType: 'movie',
      searchMode: 'find',
      selectedPlaylist: 'rewatch'
    })

    await expectPostersLoaded(page, items.length)

    const movieGrid = page.locator(tag)
    await expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordering-initial'))

    const sentConfigs = []

    await page.route('/api/set-config/watch', route => {
      sentConfigs.push(route.request().postDataJSON())
      return route.fulfill({ json: {} })
    })

    const dracula = getPoster(page, 'dracula')
    const lastPoster = getPoster(page, 'jurassic_world_renaissance')
    const { x, y, width, height } = await lastPoster.boundingBox()

    await dispatchTouch(dracula, 'touchstart', getCenter(await dracula.boundingBox()))

    await page.waitForFunction(async () => {
      const { promise, resolve } = Promise.withResolvers()
      setTimeout(resolve, 1500)
      return promise
    })

    await dispatchTouch(
      page.locator('body'),
      'touchmove',
      { x: x + width * 0.9, y: y + height - 5 }
    )

    // the insertion line shows on the right edge of the last drop target
    await expect(lastPoster).toHaveScreenshot(getScreenshotPath('touch-drop-target-last'))

    await dispatchTouch(dracula, 'touchend')

    await expect.poll(() => sentConfigs).toEqual([{
      playlists: {
        rewatch: {
          movie: ['vanished', 'high_to_lowest', 'ballerina', 'jurassic_world_renaissance', 'dracula']
        }
      }
    }])

    return expect(movieGrid).toHaveScreenshot(getScreenshotPath('touch-reordered-last'))
  })

  test('drop shadow', async ({ page }) => {
    await page.goto(getComponentUrl({ params: { items, withShadow: true } }))
    const movieGrid = page.locator(tag)

    return expect(page)
      .toHaveScreenshot(
        getScreenshotPath('with-shadow'),
        { clip: await getPaddedBoundingBox(movieGrid, 24) }
      )
  })
})

const setLayoutState = (page, state) => page.locator(tag)
  .evaluate(
    (element, stateObject) =>
      element.getJurisContext().services.HdlWatch.setLayoutState(stateObject),

    state
  )

const trackDetailEvents = page => page.locator(tag).evaluate(element => {
  element.addEventListener('detail', ({ detail }) => window.testContext.detailEvents.push(detail))
  document.body.addEventListener('detail', () => { window.testContext.bodyReceivedDetail = true })
})

const getDetailEvents = page => page.evaluate(() => window.testContext.detailEvents)

// a generic Event carrying plain touch points is used because webkit
// does not expose the Touch constructor
const dispatchTouch = (locator, type, position = { x: 0, y: 0 }) => locator.evaluate(
  (element, { type, x, y }) => {
    const event = new Event(type, { bubbles: true, composed: true, cancelable: true })
    const touch = { clientX: x, clientY: y }

    Object.assign(event, {
      touches: type === 'touchend' ? [] : [touch],
      changedTouches: [touch]
    })

    element.dispatchEvent(event)
  },

  { type, ...position }
)

const getPoster = (page, id) => page.locator('.movie-grid #' + id)

const getCenter = ({ x, y, width, height }) => ({ x: x + width / 2, y: y + height / 2 })

// manual HTML5 drag leaving the drag pending, so that mid-drag states can be
// asserted before dropping with `page.mouse.up()`
async function dragPosterTo (poster, target, targetPosition) {
  const page = poster.page()
  await poster.hover()
  await page.mouse.down()
  await target.hover()

  const { x, y, width, height } = await target.boundingBox()

  const position = {
    x: x + (targetPosition?.x ?? width / 2),
    y: y + (targetPosition?.y ?? height / 2)
  }

  await page.mouse.move(position.x, position.y)
}

async function expectPostersLoaded (page, count) {
  return expect(page.locator('.grid-poster .poster-visual.loaded'))
    .toHaveCount(count)
}

import logger from '../../../../packages/@byfrost/utils/logger.js'
import juris from '../../../../.lib/juris/instance.js'

export const STD_POSTER_WIDTH = 12.75
export const MEDIAN_POSTER_WIDTH = 18.331
export const CAROUSEL_SIZE = 7
const SCALE_MODIFIER = 0.0025
const OFFSET_MODIFIER = 0.25
const SHIFT_LIMIT = 100
const MEDIAN_INDEX = Math.ceil(CAROUSEL_SIZE / 2) - 1

const log = logger.getLogger('layout/watch/component/watch_body/hero_carousel')
const defaultCarouselPosters = new Array(CAROUSEL_SIZE).fill(undefined)
const viewTransitionStyle = new CSSStyleSheet()

viewTransitionStyle.replaceSync(`
  ::view-transition-group(root) {
    animation-delay: 200ms;
  }
`)

document.adoptedStyleSheets = [
  ...document.adoptedStyleSheets,
  viewTransitionStyle
]

juris.registerComponent('HdlWatchHeroCarousel', (
  { class: cssClass, posters, searching, styleLoaded, touchMoveDisabled, messages, ondetail },
  { services: { setStateDeep }, getState }
) => {
  const CAROUSEL_STATE_KEY = `HdlCarouselState_${Date.now()}_${String(performance.now()).replace('.', '_')}`
  const setPrefixedState = (key, value) => setStateDeep({ prefix: CAROUSEL_STATE_KEY, key, value })
  const getPrefixedState = (key, defaultValue) => getState(`${CAROUSEL_STATE_KEY}.${key}`, defaultValue)

  const staticState = new Map()
  const setStaticState = (key, value) => staticState.set(key, value)
  const getStaticState = key => staticState.get(key)

  setStaticState('thresholdReached', false)

  let posterSwitchStartX
  let switchingPoster = false
  let forcedSwitch = false
  const sourcePosters = posters?.length > 0 ? posters : defaultCarouselPosters

  // the first poster should be the median one
  const shiftedPosters = [
    ...sourcePosters.slice(-MEDIAN_INDEX),
    ...sourcePosters.slice(0, -MEDIAN_INDEX)
  ]

  const paddedPosters = [...shiftedPosters]

  while (paddedPosters.length < CAROUSEL_SIZE) {
    paddedPosters.push(shiftedPosters[paddedPosters.length % shiftedPosters.length])
  }

  let forwardCursor = paddedPosters.length % shiftedPosters.length
  let backwardCursor = shiftedPosters.length - 1

  setPrefixedState('carousel.posters', paddedPosters)

  function getNextCursorValue (cursor, length) {
    const next = cursor % length
    return next < 0 ? next + length : next
  }

  function switchPoster () {
    const direction = getPrefixedState('carousel.direction')
    const shiftedCarouselPosters = direction !== 0 && [...getPrefixedState('carousel.posters')]

    if (direction > 0) {
      shiftedCarouselPosters.pop()
      shiftedCarouselPosters.unshift(shiftedPosters[backwardCursor])
    }

    if (direction < 0) {
      shiftedCarouselPosters.shift()
      shiftedCarouselPosters.push(shiftedPosters[forwardCursor])
    }

    if (shiftedCarouselPosters) {
      forwardCursor = getNextCursorValue(forwardCursor - direction, shiftedPosters.length)
      backwardCursor = getNextCursorValue(backwardCursor - direction, shiftedPosters.length)
      setPrefixedState('carousel.posters', shiftedCarouselPosters)
    }
  }

  return {
    section: {
      class: () => {
        const classes = ['hero-carousel animated']

        if (cssClass) { classes.push(cssClass) }

        const isSearching = typeof searching === 'function' ? searching() : searching

        if (isSearching) {
          classes.push('searching')
        }

        if (getPrefixedState('carousel.manualSwitch')) {
          classes.push('manual-switch')
        }

        return classes.join(' ')
      },

      style () {
        const isSearching = typeof searching === 'function' ? searching() : searching

        return {
          visibility: styleLoaded() ? 'visible' : 'hidden',
          cursor: getPrefixedState('carousel.animating') ? 'wait' : 'default',
          pointerEvents: isSearching ? 'none' : 'auto'
        }
      },

      children () {
        const carouselPosters = getPrefixedState('carousel.posters', [])

        const carouselElements = carouselPosters.map((poster, index, { length: postersCount }) => ({
          HdlWatchHeroPoster: {
            poster,
            index,
            medianIndex: MEDIAN_INDEX,
            postersCount,
            getHostState: getPrefixedState,
            getHostStaticState: getStaticState,
            sourcePosters: shiftedPosters,
            backwardCursor,
            forwardCursor,
            ondetail: index === MEDIAN_INDEX ? ondetail : undefined
          }
        }))

        if (posters?.length > 1) {
          carouselElements.push(
            {
              button: {
                class: 'back animated hover-fx',
                title: messages.back,
                disabled: () => getPrefixedState('carousel.animating'),

                style: () => ({
                  zIndex: carouselPosters.length,
                  cursor: getPrefixedState('carousel.animating') ? 'not-allowed' : 'pointer'
                }),

                onclick () {
                  setPrefixedState({
                    carousel: {
                      animating: true,
                      shift: SHIFT_LIMIT,
                      direction: 1,
                      manualSwitch: true
                    }
                  })

                  setStaticState('thresholdReached', true)
                  forcedSwitch = true
                }
              }
            },

            {
              button: {
                class: 'forward animated hover-fx',
                title: messages.forward,
                disabled: () => getPrefixedState('carousel.animating'),

                style: () => ({
                  zIndex: carouselPosters.length,
                  cursor: getPrefixedState('carousel.animating') ? 'not-allowed' : 'pointer'
                }),

                onclick () {
                  setPrefixedState({
                    carousel: {
                      animating: true,
                      shift: -SHIFT_LIMIT,
                      direction: -1,
                      manualSwitch: true
                    }
                  })

                  setStaticState('thresholdReached', true)
                  forcedSwitch = true
                }
              }
            }
          )
        }

        return carouselElements
      },

      ...(posters?.length > 1 && {
        ontouchstart ({ touches: [{ clientX }] }) {
          if (getPrefixedState('carousel.animating')) { return }
          posterSwitchStartX = clientX
        },

        ontouchmove (event) {
          if (touchMoveDisabled()) { event.preventDefault() }

          const { touches: [{ clientX }] } = event
          const animating = getPrefixedState('carousel.animating')

          log.debug('carousel/onTouchMove', { animating })

          if (animating) { return }

          const deltaX = clientX - posterSwitchStartX
          const direction = Math.sign(deltaX)
          setStaticState('thresholdReached', Math.abs(deltaX) >= SHIFT_LIMIT)

          let shift

          if (getStaticState('thresholdReached')) {
            const absExtraShift = (Math.abs(deltaX) - SHIFT_LIMIT) || 1
            shift = direction * (SHIFT_LIMIT + Math.log(absExtraShift) * 7.5)
          } else {
            shift = deltaX
          }

          setPrefixedState({ carousel: { shift, direction } })

          log.debug('carousel/onTouchMove', {
            deltaX, shift, direction, thresholdReached: getStaticState('thresholdReached')
          })
        },

        ontouchend () {
          posterSwitchStartX = 0
          const animating = getPrefixedState('carousel.animating')

          log.debug('carousel/onTouchEnd', { animating })

          if (animating) { return }

          if (Math.abs(getPrefixedState('carousel.shift', 0)) > 0) {
            setPrefixedState({
              carousel: {
                animating: true,
                shift: 0
              }
            })
          }
        },

        async ontransitionend ({ target, propertyName }) {
          const isMedianPosterTranslating = target.matches('.median') && propertyName === 'translate'

          if (isMedianPosterTranslating) {
            log.debug('carousel/onTransitionEnd', {
              carouselState: {
                shift: getPrefixedState('carousel.shift'),
                direction: getPrefixedState('carousel.direction'),
                animating: getPrefixedState('carousel.animating')
              },

              switchingPoster,
              forcedSwitch
            })
          }

          if (switchingPoster || !isMedianPosterTranslating) { return }

          if (forcedSwitch) {
            forcedSwitch = false
            setPrefixedState('carousel.shift', 0)
            return
          }

          if (getStaticState('thresholdReached')) {
            switchingPoster = true
            setStaticState('thresholdReached', false)

            if (document.startViewTransition) {
              await document.startViewTransition(switchPoster).finished
            } else {
              switchPoster()
              const { promise: viewUpdateComplete, resolve: completeViewUpdate } = Promise.withResolvers()
              requestAnimationFrame(completeViewUpdate)
              await viewUpdateComplete
            }
          }

          setPrefixedState({
            carousel: {
              animating: false,
              manualSwitch: false
            }
          })

          switchingPoster = false
        }
      })
    }
  }
})

juris.registerComponent('HdlWatchHeroPoster', ({
  poster,
  index,
  medianIndex,
  postersCount,
  getHostState,
  getHostStaticState,
  sourcePosters,
  backwardCursor,
  forwardCursor,
  ondetail
}) => {
  const lastIndex = postersCount - 1
  let posterUpdated = false

  return {
    div: {
      class () {
        const classes = ['hero-poster']

        if (index === medianIndex) { classes.push('median') }
        if (getHostState('carousel.animating')) { classes.push('animated') }
        if (ondetail) { classes.push('detailable') }

        return classes.join(' ')
      },

      style (posterElt) {
        const shift = getHostState('carousel.shift', 0)
        const direction = getHostState('carousel.direction', 0)
        const animating = getHostState('carousel.animating', false)

        if (!animating) { posterUpdated = false }

        const currentMedianIndex =
          getHostStaticState('thresholdReached') && animating ? medianIndex - direction : medianIndex

        const targetIndex = currentMedianIndex - direction
        const currentOffset = currentMedianIndex - index
        const offsetDirection = Math.sign(currentOffset)
        const absoluteOffset = Math.abs(currentOffset)
        const regularZIndex = currentMedianIndex - absoluteOffset
        const absShift = Math.abs(shift)

        const scaleRatio = index < currentMedianIndex
          ? (shift < 0 ? absoluteOffset * OFFSET_MODIFIER : index)
          : (shift < 0 ? lastIndex - index : absoluteOffset * OFFSET_MODIFIER)

        let translate

        if (
          getHostStaticState('thresholdReached') &&
          animating &&
          (
            (direction < 0 && index === 0) ||
            (direction > 0 && index === lastIndex)
          )
        ) {
          const maxOffset = direction * Math.floor(getHostState('carousel.posters').length / 2)
          translate = `calc(${-100 * maxOffset - 50}% - ${maxOffset} * var(--gap)) -50%`

          if (!posterUpdated) {
            let nextPosterIndex

            if (direction < 0) { nextPosterIndex = forwardCursor }
            if (direction > 0) { nextPosterIndex = backwardCursor }

            const nextPoster = sourcePosters[nextPosterIndex]
            const posterImgElt = nextPoster && posterElt.querySelector('.poster-visual')

            if (nextPoster && posterImgElt && nextPoster.snapshot !== posterImgElt.getAttribute('src')) {
              posterUpdated = true

              log.debug(
                'HdlWatchHeroPoster/style/bound',
                {
                  index,
                  poster,
                  nextPosterIndex,
                  nextPoster,
                  direction,
                  forwardCursor,
                  backwardCursor,
                  thresholdReached: getHostStaticState('thresholdReached'),
                  medianIndex,
                  currentMedianIndex,
                  targetIndex
                }
              )

              let frameCount = 0

              const waitForFifthFrame = () => {
                frameCount++
                if (frameCount < 5) {
                  requestAnimationFrame(waitForFifthFrame)
                } else {
                  posterImgElt.setAttribute('src', nextPoster.snapshot)
                }
              }

              requestAnimationFrame(waitForFifthFrame)
            }
          }
        } else {
          const shiftModifier = 1 / (absoluteOffset || 1)

          const translateShift = Math.sign(shift) !== Math.sign(currentOffset)
            ? shiftModifier * shift
            : shift

          translate =
            `calc(${-100 * currentOffset - 50}% - ${currentOffset} * var(--gap) + ${translateShift}%) -50%`
        }

        const medianPosterScale = getHostState('medianPosterWidth', MEDIAN_POSTER_WIDTH) /
          getHostState('standardPosterWidth', STD_POSTER_WIDTH)

        const scale = index !== currentMedianIndex
          ? 1 + offsetDirection * shift * scaleRatio * SCALE_MODIFIER
          : medianPosterScale - absShift * SCALE_MODIFIER

        const altZIndex = index === targetIndex ? postersCount : postersCount - 1
        const zIndex = scale <= medianPosterScale * 0.9 ? regularZIndex : altZIndex

        let brightnessShift
        let shadowOpacity

        if ([currentMedianIndex, targetIndex].includes(index)) {
          const brightnessDelta = absShift / 2

          if (direction !== 0 && targetIndex === index) {
            brightnessShift = 50 + brightnessDelta
            shadowOpacity = absShift
          } else {
            brightnessShift = 100 - brightnessDelta
            shadowOpacity = 100 - absShift
          }
        } else {
          brightnessShift = 50
          shadowOpacity = 0
        }

        const filter = `brightness(${brightnessShift}%)`

        const boxShadow =
          `0 0 1px 0 rgb(var(--sky)),
           0 0 var(--hero-poster-shadow-length) rgba(0,0,0,${shadowOpacity}%)`

        log.debug('HdlWatchHeroPoster/style', {
          thresholdReached: getHostStaticState('thresholdReached'),
          index,
          medianIndex,
          currentMedianIndex,
          targetIndex,
          poster,
          zIndex,
          scale,
          translate,
          filter,
          boxShadow
        })

        return { zIndex, scale, translate, filter, boxShadow }
      },

      onclick: ondetail && (() => ondetail(poster)),
      children: poster && { img: { class: 'poster-visual animated', src: poster.snapshot, loading: 'lazy' } }
    }
  }
})

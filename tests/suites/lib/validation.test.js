import { test } from '@japa/runner'
import * as td from 'testdouble'

let createValidator

test.group('#createValidator', group => {
  const nativeConsoleError = console.error

  group.each.setup(async () => {
    await td.replaceEsm(
      '../../../lib/environment.js',
      { isDevelopment: true }
    );

    ({ createValidator } =
      await import(`../../../lib/validation.js?t=${Date.now()}.${performance.now()}`))
  })

  group.each.teardown(() => {
    console.error = nativeConsoleError
    td.reset()
  })

  test('successfull validation', ({ expect }) => {
    const layout = 'dashboard'
    const component = 'widget'
    const value = 'value'
    const prop = 'prop'
    const schemaValidate = td.function('schemaValidate')
    const schema = { validate: schemaValidate }

    console.error = td.function('error')

    td.when(schemaValidate(value, { convert: false }))
      .thenReturn({})

    const validate = createValidator(`${layout}/${component}`)
    validate(value, prop, schema)

    expect(td.explain(console.error).callCount).toBe(0)
  })

  test('validation failure', () => {
    const layout = 'dashboard'
    const component = 'widget'
    const value = 'value'
    const prop = 'prop'
    const schemaValidate = td.function('schemaValidate')
    const schema = { validate: schemaValidate }
    const error = { message: 'Validation failure' }

    console.error = td.function('error')

    td.when(schemaValidate(td.matchers.isA(String), td.matchers.isA(Object)))
      .thenReturn({ error })

    const validate = createValidator(`${layout}/${component}`)
    validate(value, prop, schema)

    td.verify(console.error(`${component}/${prop}: ${error.message}`))
  })

  test('validation skip for production', ({ expect }) => {
    expect(() => createValidator()).not.toThrow()

    const validate = createValidator('layout/component')
    expect(() => validate()).not.toThrow()
  }).setup(async () => {
    await td.replaceEsm('../../../lib/environment.js', { isDevelopment: false });

    ({ createValidator } =
      await import(`../../../lib/validation.js?t=${Date.now()}.${performance.now()}`))
  })

  test('path argument validation', ({ expect }) => {
    expect(() => createValidator()).toThrow('"path" argument is missing')

    const path = 'dashboard'
    expect(() => createValidator('dashboard'))
      .toThrow(`"path" is not valid (expected layout/component, actual ${path})`)
  })

  test('validator arguments validation', ({ expect }) => {
    const validate = createValidator('dashboard/widget')
    expect(() => validate('value')).toThrow('"propName" argument is missing')
    expect(() => validate('value', 'prop')).toThrow('"schema" argument is missing')
  })
})

import { test } from '@japa/runner'
import * as td from 'testdouble'
import { createValidator } from '../../../lib/validation.js'

test.group('#createValidator', group => {
  const nativeConsoleError = console.error

  group.each.setup(() => {
    globalThis.document = {
      documentElement: {
        classList: {
          contains: td.function('contains')
        }
      }
    }
  })

  group.each.teardown(() => {
    console.error = nativeConsoleError
    delete globalThis.document
  })

  test('successfull validation', ({ expect }) => {
    const layout = 'dashboard'
    const component = 'widget'
    const value = 'value'
    const prop = 'prop'
    const schema = { label: td.function('label') }
    const schemaValidate = td.function('schemaValidate')

    console.error = td.function('error')

    td.when(document.documentElement.classList.contains('development'))
      .thenReturn(true)

    td.when(schemaValidate(value, { convert: false }))
      .thenReturn({})

    td.when(schema.label(`hdl-${layout}-${component}/${prop}`))
      .thenReturn({ validate: schemaValidate })

    const validate = createValidator(`${layout}/${component}`)
    validate(value, prop, schema)

    expect(td.explain(console.error).callCount).toBe(0)
  })

  test('validation failure', () => {
    const layout = 'dashboard'
    const component = 'widget'
    const value = 'value'
    const prop = 'prop'
    const schema = { label: td.function('label') }
    const schemaValidate = td.function('schemaValidate')
    const error = { message: 'Validation failure' }

    console.error = td.function('error')

    td.when(document.documentElement.classList.contains(td.matchers.anything()))
      .thenReturn(true)

    td.when(schemaValidate(td.matchers.isA(String), td.matchers.isA(Object)))
      .thenReturn({ error })

    td.when(schema.label(td.matchers.isA(String)))
      .thenReturn({ validate: schemaValidate })

    const validate = createValidator(`${layout}/${component}`)
    validate(value, prop, schema)

    td.verify(console.error(error.message))
  })

  test('validation skip for production', ({ expect }) => {
    td.when(document.documentElement.classList.contains('development'))
      .thenReturn(false)

    const validate = createValidator()
    expect(() => validate()).not.toThrow()
  })

  test('path argument validation', ({ expect }) => {
    td.when(document.documentElement.classList.contains(td.matchers.anything()))
      .thenReturn(true)

    expect(() => createValidator()).toThrow('"path" argument is missing')

    const path = 'dashboard'
    expect(() => createValidator('dashboard'))
      .toThrow(`"path" is not valid (expected layout/component, actual ${path})`)
  })

  test('validator arguments validation', ({ expect }) => {
    td.when(document.documentElement.classList.contains(td.matchers.anything()))
      .thenReturn(true)

    const validate = createValidator('dashboard/widget')

    expect(() => validate('value')).toThrow('"propName" argument is missing')
    expect(() => validate('value', 'prop')).toThrow('"schema" argument is missing')
  })
})

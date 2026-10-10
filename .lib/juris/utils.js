export function flattenObject (obj, prefix) {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenObject(value, path)
    }

    return [[path, value]]
  })
}

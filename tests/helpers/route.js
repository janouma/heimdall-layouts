export function createCountListener (route, threshold) {
  let count = 0
  return fetchObject => fetchObject.url().endsWith(route) && ++count === threshold
}

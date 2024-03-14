export function gererateId (seed) {
  const idBase =
    `${seed.trim().replaceAll(/\W+/g, '-')}-${Date.now()}${performance.now()}`

  return idBase.replaceAll('.', '-')
}

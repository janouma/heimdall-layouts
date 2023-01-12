export function isTestEnv () {
  return url.searchParams.get('env') === 'playwright'
}

const url = new URL(document.location.href)

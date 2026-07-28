if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = () => {
    let resolveFn
    let rejectFn

    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve
      rejectFn = reject
    })

    return {
      promise,
      resolve: resolveFn,
      reject: rejectFn
    }
  }
}

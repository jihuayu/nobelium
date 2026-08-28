const stylexRuntimeUrl = new URL('./stylex-test-runtime.mjs', import.meta.url).href

export function resolve(specifier, context, nextResolve) {
  if (specifier === '@stylexjs/stylex') {
    return { shortCircuit: true, url: stylexRuntimeUrl }
  }
  return nextResolve(specifier, context)
}

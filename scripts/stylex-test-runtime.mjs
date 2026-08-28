export function create(styleDefinitions) {
  return Object.fromEntries(
    Object.keys(styleDefinitions).map(name => [name, `stylex-test-${name}`])
  )
}

export function defineVars(definitions) {
  return Object.fromEntries(
    Object.keys(definitions).map(name => [name, `var(--stylex-test-${name})`])
  )
}

export function createTheme() {
  return 'stylex-test-theme'
}

export function props(...styles) {
  const className = styles.flat().filter(Boolean).join(' ')
  return className ? { className } : {}
}

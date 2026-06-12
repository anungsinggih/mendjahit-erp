import { execSync } from 'node:child_process'

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const riskyTrackedFiles = trackedFiles.filter((file) =>
  /^\.env(?!\.example$)/.test(file) ||
  file.includes('service_role') ||
  file.includes('secret'),
)

if (riskyTrackedFiles.length > 0) {
  console.error('Tracked secret-like files detected:')
  riskyTrackedFiles.forEach((file) => console.error(`- ${file}`))
  process.exit(1)
}

console.log('Secret audit passed: no tracked secret-like env files found.')


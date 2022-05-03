import { execa } from 'execa'
import minimist from 'minimist'

const args = minimist(process.argv.slice(2))
const targets = args._

for (const target of targets) {
  build(target)
}


async function build(target) {
  await execa('rollup', ['-c', '--environment', [
    `TARGET:${target}`
  ].join(',')], { stdio: 'inherit' })
}
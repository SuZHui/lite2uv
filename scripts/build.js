/* eslint-disable no-restricted-syntax */
const path = require('path')
const args = require('minimist')(process.argv.slice(2))
const fs = require('fs-extra')

const targets = args._
const isRelease = args.release
const buildTypes = args.t || args.types || isRelease

for (const target of targets) {
  build(target)
}

// const execa = (await import('execa')).default;

async function build(target) {
  const pkgDir = path.resolve(`packages/${target}`)
  const pkg = require(`${pkgDir}/package.json`)

  const execa = (await import('execa')).execa

  await execa('rollup', ['-c', '--environment', [
    `TARGET:${target}`,
    buildTypes ? `TYPES:true` : ''
  ].filter(Boolean).join(',')], { stdio: 'inherit' })

  if (buildTypes && pkg.types) {
    console.log(`Rolling up type definitions for ${target}...`)

    // build types
    const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor')

    const extractorConfigPath = path.resolve(pkgDir, `api-extractor.json`)
    console.log(`Using extractor config: ${extractorConfigPath}`)

    const extractorConfig =
      ExtractorConfig.loadFileAndPrepare(extractorConfigPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true
    })

    if (extractorResult.succeeded) {
      // concat additional d.ts to rolled-up dts
      const typesDir = path.resolve(pkgDir, 'types')

      try {
        await fs.access(typesDir)

        const dtsPath = path.resolve(pkgDir, pkg.types)
        const existing = await fs.readFile(dtsPath, 'utf-8')
        const typeFiles = await fs.readdir(typesDir)
        const toAdd = await Promise.all(
          typeFiles.map(file => {
            return fs.readFile(path.resolve(typesDir, file), 'utf-8')
          })
        )
        await fs.writeFile(dtsPath, existing + '\n' + toAdd.join('\n'))
      } catch {

      } finally {
        console.log(`API Extractor completed successfully.`)
      }
    } else {
      console.error(
        `API Extractor completed with ${extractorResult.errorCount} errors` +
          ` and ${extractorResult.warningCount} warnings`
      )
      process.exitCode = 1
    }

    await fs.remove(`${pkgDir}/dist/packages`)
  }
}
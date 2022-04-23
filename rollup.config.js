import path from 'path'

// TODO: 需要打包的包名通过process.env.TARGET获取
const TARGET = ''

const packagesDir =path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, TARGET)
const resolve = p => path.resolve(packageDir, p)
const name = path.basename(packageDir)

const outputConfig = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `es`
  },
  'esm-browser': {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: `es`
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`
  },
  // runtime-only builds, for main "vue" package only
  'esm-bundler-runtime': {
    file: resolve(`dist/${name}.runtime.esm-bundler.js`),
    format: `es`
  },
  'esm-browser-runtime': {
    file: resolve(`dist/${name}.runtime.esm-browser.js`),
    format: 'es'
  },
  'global-runtime': {
    file: resolve(`dist/${name}.runtime.global.js`),
    format: 'iife'
  }
}

const defaultFormats = ['esm-bundler', 'cjs']

const packageConfigs = defaultFormats.map(format => createConfig(format, outputConfig[format]))

export default packageConfigs

function createConfig(format, output, plugins = []) {
  if (!output) {
    console.log(`invalid format: "${format}"`)
    process.exit(1)
  }

  const entryFile = `src/index.ts`

  return {
    input: resolve(entryFile),
    plugins: {
      ...plugins
    },
    output
  }
}

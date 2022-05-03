import path from 'path'
import ts from 'rollup-plugin-typescript2'

if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.')
}

// 需要打包的包名通过process.env.TARGET获取
const TARGET = process.env.TARGET

const packagesDir =path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, TARGET)
const resolve = p => path.resolve(packageDir, p)
const pkg = require(resolve(`package.json`))
const name = path.basename(packageDir)

// ensure TS checks only once for each build
let hasTSChecked = false

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

  output.sourcemap = !!process.env.SOURCE_MA

  const shouldEmitDeclarations =
    pkg.types && process.env.TYPES != null && !hasTSChecked

  const tsPlugin = ts({
    check: false,
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: output.sourcemap,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations
      },
      exclude: ['**/__tests__', 'test-dts']
    }
  })

  const entryFile = `src/index.ts`

  return {
    input: resolve(entryFile),
    plugins: [
      tsPlugin,
      ...plugins
    ],
    output
  }
}

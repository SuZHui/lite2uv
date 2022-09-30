// Using esbuild for faster dev builds.
// We are still using Rollup for production builds because it generates
// smaller files w/ better tree-shaking.
// 开发模式使用esbuild是为了更快的构建速度
// 在生产模式中使用rollup是为了生成更小的文件，更好的tree-shaking

const { build } = require('esbuild')
const { resolve, relative } = require('path')
const args = require('minimist')(process.argv.slice(2))

// TODO: 暂时写死reactivity包
const target = args._[0] || 'lite2uv';
const format = args.f || 'global';

const pkg = require(resolve(__dirname, `../packages/${target}/package.json`))

// const pkg = JSON.parse(await readFile(resolve(__dirname, '../packages', target, 'package.json')))

// resolve output
const outputFormat = format.startsWith('global')
  ? 'iife'
  : format === 'cjs'
  ? 'cjs'
  : 'esm';

const postfix = format.endsWith('-runtime')
  ? `runtime.${format.replace(/-runtime$/, '')}`
  : format;
const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${postfix}.js`
);
const relativeOutfile = relative(process.cwd(), outfile);

build({
  // 构建入口
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile,
  bundle: true,
  sourcemap: true,
  format: outputFormat,
  define: {
    __VERSION__: `"${pkg.version}"`,
    __DEV__: 'true',
  },
  watch: {
    onRebuild(error) {
      if (!error) console.log(`rebuilt: ${relativeOutfile}`);
    },
  },
}).then(() => {
  console.log(`watching: ${relativeOutfile}`);
});

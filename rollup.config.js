import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/umd/weave.js',
      format: 'umd',
      name: 'Weave',
      sourcemap: false
    },
    {
      file: 'dist/umd/weave.min.js',
      format: 'umd',
      name: 'Weave',
      sourcemap: false,
      plugins: [terser()]
    }
  ],
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false
    })
  ]
};

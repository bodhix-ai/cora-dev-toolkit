import { defineConfig, type Options } from 'tsup';

export function createModuleConfig(options: Partial<Options> = {}) {
  return {
    entry: {
      index: 'index.ts',
      'admin/index': 'components/admin/index.ts',
      ...options.entry
    },
    format: ['esm'],
    outExtension: () => ({ js: '.js' }),
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    banner: {
      js: '"use client";'
    },
    external: [
      'react',
      'react-dom',
      'next',
      'next-auth',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled'
    ],
    ...options
  };
}

export default createModuleConfig();
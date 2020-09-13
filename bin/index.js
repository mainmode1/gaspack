#!/usr/bin/env node

const path = require('path');
const sade = require('sade');
const vfs = require('vinyl-fs');
const chalk = require('chalk');

const pkg = require(path.resolve(__dirname, '../package.json'));
const gaspack = require(path.resolve(__dirname, '..', pkg.main));

sade(`${pkg.name} <entry>`, true)
  .version(pkg.version)
  .describe(pkg.description)
  .example('--modules ../lib -d ./dist Code.js')
  .option('-d, --dest', 'Output dir', './gaspack')
  .option('-m, --modules', 'Search path for external GAS modules')
  .option('--gasModules', 'GAS project "folder" for non-local GAS modules', 'lib')
  .option('--nodeModules', 'GAS project "folder" for NodeJS modules', 'node_modules')
  .option('--builtins', 'GAS project "folder" for builtin/shim modules', 'builtins')
  .option('--nodeModulesBundle', 'GAS project "filename" for NodeJS modules *bundle*', 'node_modules.js')
  .option('--builtinsBundle', 'GAS project "filename" for builtin/shim modules *bundle*', 'builtins.js')
  .option('--noBundle', 'Do not bundle builtin/shim or node package modules', false)
  .option('--noMinify', 'Do not minify bundle code', false)
  .option('--noGlobals', 'Do not require global shims/polyfills at the top of entry functions', false)
  .option('--noBabel', 'Disable global shims/polyfills & transforms, ie. ES modules & async to promises', false)
  .option('--noRequireUrl', 'Disable module require by url', false)
  .action(
    (
      entry,
      {
        dest,
        modules = '',
        gasModules,
        nodeModules,
        builtins,
        nodeModulesBundle,
        builtinsBundle,
        noMinify,
        noBundle,
        noGlobals,
        noBabel,
        noRequireUrl,
      },
    ) => {
      console.log(`${pkg.name} entry:`, chalk.green(entry), 'dest:', chalk.green(dest), ' ...');
      const packOpts = {
        modulesPath: modules,
        gasPaths: { gasModules, nodeModules, builtins, nodeModulesBundle, builtinsBundle },
        noMinify,
        noBundle,
        noGlobals,
        noBabel,
        noRequireUrl,
      };
      console.log(packOpts);
      console.time(pkg.name);
      vfs
        .src(entry)
        .pipe(gaspack(packOpts))
        .pipe(vfs.dest(dest))
        .on('finish', () => {
          console.timeEnd(pkg.name);
        });
    },
  )
  .parse(process.argv, {
    unknown: (arg) => `Unknown argument: ${arg}`,
  });

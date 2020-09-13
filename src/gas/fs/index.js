/*
  fs.access(path[, mode], callback)
  fs.accessSync(path[, mode])
  fs.appendFile(path, data[, options], callback)
  fs.appendFileSync(path, data[, options])
  fs.constants
  fs.copyFile(src, dest[, mode], callback)
  fs.copyFileSync(src, dest[, mode])
  fs.exists(path, callback)
  fs.existsSync(path)
  fs.mkdir(path[, options], callback)
  fs.mkdirSync(path[, options])
  fs.readFile(path[, options], callback)
  fs.readFileSync(path[, options])
  fs.rename(oldPath, newPath, callback)
  fs.renameSync(oldPath, newPath)
  fs.rmdir(path[, options], callback)
  fs.rmdirSync(path[, options])
  fs.stat(path[, options], callback)
  fs.statSync(path[, options])
  fs.unlink(path, callback)
  fs.unlinkSync(path)
  fs.writeFile(file, data[, options], callback)
  fs.writeFileSync(file, data[, options])
*/

// https://nodejs.org/api/fs.html

const Buffer = require('buffer').Buffer;

const gdrive = require('./gdrive');
const { SystemError, constants } = require('./error');

const fs = {
  constants,

  exists: (path, callback) => {
    if (typeof callback === 'function') callback(fs.existsSync(path));
  },

  existsSync: (path) => {
    if (Buffer.isBuffer(path)) path = path.toString();
    if (gdrive.resolvePath(path)) return true;
    return false;
  },

  readFile: (filename, options, callback) => {
    if (typeof options === 'function') callback = options;
    try {
      const contents = fs.readFileSync(filename, options);
      if (typeof callback === 'function') callback(undefined, contents);
    } catch (err) {
      err.syscall = 'readFile';
      if (typeof callback === 'function') callback(err, undefined);
    }
  },

  readFileSync: (filename, options) => {
    if (Buffer.isBuffer(filename)) filename = filename.toString();
    if (options && typeof options !== 'string') options = options.encoding;
    try {
      const contents = gdrive.getDataByPath(filename, options);
      if (!contents)
        throw new SystemError(`could not get contents of file: ${filename}`, {
          errno: constants.ENOENT,
          code: 'ENOENT',
        });
      return contents;
    } catch (err) {
      err.syscall = 'readFileSync';
      err.path = err.path || filename;
      throw err;
    }
  },

  // TODO: options.recursive?
  mkdir: (path, mode, callback) => {
    if (typeof mode === 'function') callback = mode;
    try {
      fs.mkdirSync(path, mode);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'mkdir';
      if (typeof callback === 'function') callback(err);
    }
  },

  // eslint-disable-next-line no-unused-vars
  mkdirSync: (path, mode) => {
    // mode is ignored
    if (Buffer.isBuffer(path)) path = path.toString();
    try {
      if (!gdrive.newFolderByPath(path))
        throw new SystemError(`could not create directory: ${path}`, {
          errno: constants.ENODATA,
          code: 'ENODATA',
        });
    } catch (err) {
      err.syscall = 'mkdirSync';
      err.path = err.path || path;
      throw err;
    }
  },

  rmdir: (path, callback) => {
    try {
      fs.rmdirSync(path);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'rmdir';
      if (typeof callback === 'function') callback(err);
    }
  },

  rmdirSync: (path) => {
    if (Buffer.isBuffer(path)) path = path.toString();
    try {
      if (!gdrive.rmFolderByPath(path))
        throw new SystemError(`could not remove directory: ${path}`, {
          errno: constants.ENOTDIR,
          code: 'ENOTDIR',
        });
    } catch (err) {
      err.syscall = 'rmdirSync';
      err.path = err.path || path;
      throw err;
    }
  },

  unlink: (path, callback) => {
    try {
      fs.unlinkSync(path);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'unlink';
      if (typeof callback === 'function') callback(err);
    }
  },

  unlinkSync: (path) => {
    if (Buffer.isBuffer(path)) path = path.toString();
    try {
      if (!gdrive.rmFileByPath(path))
        throw new SystemError(`could not unlink file: ${path}`, {
          errno: constants.ENOENT,
          code: 'ENOENT',
        });
    } catch (err) {
      err.syscall = 'unlinkSync';
      err.path = err.path || path;
      throw err;
    }
  },

  rename: (oldPath, newPath, callback) => {
    try {
      fs.renameSync(oldPath, newPath);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'rename';
      if (typeof callback === 'function') callback(err);
    }
  },

  renameSync: (oldPath, newPath) => {
    if (Buffer.isBuffer(oldPath)) oldPath = oldPath.toString();
    if (Buffer.isBuffer(newPath)) newPath = newPath.toString();
    try {
      if (!gdrive.mvByPath(oldPath, newPath))
        throw new SystemError(`could not rename: ${oldPath} to: ${oldPath}`, {
          errno: constants.ENODATA,
          code: 'ENODATA',
        });
    } catch (err) {
      err.syscall = 'renameSync';
      err.path = err.path || oldPath;
      throw err;
    }
  },

  copyFile: (src, dest, mode = 0, callback) => {
    if (typeof mode === 'function') callback = mode;
    try {
      fs.copyFileSync(src, dest, mode);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'copyFile';
      if (typeof callback === 'function') callback(err);
    }
  },

  copyFileSync: (src, dest, mode = 0) => {
    if (Buffer.isBuffer(src)) src = src.toString();
    if (Buffer.isBuffer(dest)) dest = dest.toString();
    let overwrite = !(mode & (1 << 0));
    try {
      if (!gdrive.copyFileByPath(src, dest, overwrite))
        throw new SystemError(`could not copy file: ${src} to: ${dest}`, {
          errno: constants.ENODATA,
          code: 'ENODATA',
        });
    } catch (err) {
      err.syscall = 'copyFileSync';
      err.path = err.path || src;
      throw err;
    }
  },

  writeFile: (filename, data, options, callback) => {
    if (typeof options === 'function') callback = options;
    try {
      fs.writeFileSync(filename, data, options);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'writeFile';
      if (typeof callback === 'function') callback(err);
    }
  },

  writeFileSync: (filename, data, options) => {
    if (Buffer.isBuffer(filename)) filename = filename.toString();
    if (options && typeof options !== 'string') options = options.encoding;
    try {
      if (!gdrive.setDataByPath(filename, data, options))
        throw new SystemError(`could not write data to file: ${filename}`, {
          errno: constants.ENODATA,
          code: 'ENODATA',
        });
    } catch (err) {
      err.syscall = 'writeFileSync';
      err.path = err.path || filename;
      throw err;
    }
  },

  appendFile: (filename, data, options, callback) => {
    if (typeof options === 'function') callback = options;
    try {
      fs.appendFileSync(filename, data, options);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'appendFile';
      if (typeof callback === 'function') callback(err);
    }
  },

  appendFileSync: (filename, data, options) => {
    if (Buffer.isBuffer(filename)) filename = filename.toString();
    if (options && typeof options !== 'string') options = options.encoding;
    try {
      if (!gdrive.appendDataByPath(filename, data, options))
        throw new SystemError(`could not append data to file: ${filename}`, {
          errno: constants.ENODATA,
          code: 'ENODATA',
        });
    } catch (err) {
      err.syscall = 'appendFileSync';
      err.path = err.path || filename;
      throw err;
    }
  },

  stat: function (path, options, callback) {
    if (typeof options === 'function') callback = options;
    try {
      let stats = fs.statSync(path, options);
      if (typeof callback === 'function') callback(undefined, stats);
    } catch (err) {
      err.syscall = 'stat';
      if (typeof callback === 'function') callback(err, undefined);
    }
  },

  // eslint-disable-next-line no-unused-vars
  statSync: function (path, options) {
    // options is ignored
    if (Buffer.isBuffer(path)) path = path.toString();
    try {
      if (!fs.existsSync(path))
        throw new SystemError(`path: ${path} does not exist`, {
          errno: constants.ENOENT,
          code: 'ENOENT',
        });
      return gdrive.statByPath(path);
    } catch (err) {
      err.syscall = 'statSync';
      err.path = err.path || path;
      throw err;
    }
  },

  access: (path, mode, callback) => {
    try {
      fs.chmodSync(path, mode);
      if (typeof callback === 'function') callback(undefined);
    } catch (err) {
      err.syscall = 'access';
      if (typeof callback === 'function') callback(err);
    }
  },

  // eslint-disable-next-line no-unused-vars
  accessSync: (path, mode) => {
    if (!fs.existsSync(path))
      throw new SystemError(`${path} does not exist`, {
        errno: constants.ENOENT,
        code: 'ENOENT',
        syscall: 'accessSync',
        path: path,
      });
  },
};

const unsupported = [
  'chmod',
  'chmodSync',
  'chown',
  'chownSync',
  'close',
  'closeSync',
  'createReadStream',
  'createWriteStream',
  'fchmod',
  'fchmodSync',
  'fchown',
  'fchownSync',
  'fdatasync',
  'fdatasyncSync',
  'fstat',
  'fstatSync',
  'fsync',
  'fsyncSync',
  'ftruncate',
  'ftruncateSync',
  'futimes',
  'futimesSync',
  'lchmod',
  'lchmodSync',
  'lchown',
  'lchownSync',
  'lutimes',
  'lutimesSync',
  'link',
  'linkSync',
  'lstat',
  'lstatSync',
  'mkdtemp',
  'mkdtempSync',
  'open',
  'opendir',
  'opendirSync',
  'openSync',
  'read',
  'readdir',
  'readdirSync',
  'readlink',
  'readlinkSync',
  'readSync',
  'readv',
  'readvSync',
  'realpath',
  'realpathSync',
  'symlink',
  'symlinkSync',
  'truncate',
  'truncateSync',
  'unwatchFile',
  'utimes',
  'utimesSync',
  'watch',
  'watchFile',
  'write',
  'writeSync',
  'writev',
  'writevSync',
];

const _notImplemented = (fname) => () => {
  throw new SystemError('not implemented', {
    errno: constants.ENOSYS,
    code: 'ENOSYS',
    syscall: fname,
  });
};

for (let fn of unsupported) {
  fs[fn] = _notImplemented(fn);
}

module.exports = fs;

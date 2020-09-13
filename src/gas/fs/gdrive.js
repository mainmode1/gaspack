const { parse, resolve, dirname, basename } = require('path');
const Buffer = require('buffer').Buffer;

const { wrap, expCall } = require('../backoff');
const { SystemError, constants } = require('./error');

const isString = (s) => s && (typeof s === 'string' || s instanceof String);

const getScriptId = wrap(eval('Script' + 'App').getScriptId);

// https://developers.google.com/apps-script/reference/drive/drive-app
const driveGetRootFolder = wrap(eval('Drive' + 'App').getRootFolder);
const driveGetFolderById = wrap(eval('Drive' + 'App').getFolderById);
const driveGetFileById = wrap(eval('Drive' + 'App').getFileById);

// https://developers.google.com/drive/api/v2/search-files#query_string_examples
// https://developers.google.com/drive/api/v2/ref-search-terms
// https://developers.google.com/apps-script/reference/drive/drive-app#searchfilesparams
// const searchFiles = wrap(eval('Drive' + 'App').searchFiles);
// const searchFolders = wrap(eval('Drive' + 'App').searchFolders);

// enforceSingleParent(true)

// TODO: horrifically slow; rewrite using Advanced Drive Service API?
// https://developers.google.com/apps-script/advanced/drive#listing_folders

// do once to improve performance
const root = driveGetRootFolder();
const isRoot = (id = '') => root.getId() === id;

const gdrive = {
  resolvePath: (path = '') => {
    if (!path) return null;
    path = resolve(path);
    return path
      .split('/')
      .filter((parent) => parent !== 'My Drive')
      .filter(Boolean)
      .reduce((parent, child) => {
        if (!parent) return null;
        const folders = expCall(parent.getFoldersByName, child);
        const folder = folders.hasNext() ? folders.next() : null;
        if (folder) {
          return folder;
        } else {
          const files = expCall(parent.getFiles);
          while (files.hasNext()) {
            const file = files.next();
            if (file.getName() === child) return file;
          }
        }
        return null;
      }, root);
  },

  getFolderByPath: (path) => {
    const folder = gdrive.resolvePath(path);
    return folder && typeof folder.getMimeType === 'undefined' ? folder : null;
  },

  getFileByPath: (path) => {
    const file = gdrive.resolvePath(path);
    return file && typeof file.getMimeType !== 'undefined' ? file : null;
  },

  getFolderById: (id = '', inTrash = false) => {
    if (!id) return null;
    const folder = driveGetFolderById(id);
    if (!folder || (!inTrash && folder.isTrashed())) return null;
    return folder;
  },

  getFileById: (id = '', inTrash = false) => {
    if (!id) return null;
    const file = driveGetFileById(id);
    if (!file || (!inTrash && file.isTrashed())) return null;
    return file;
  },

  getPathByFolderId: (id, folderPath) => {
    let folder = gdrive.getFolderById(id);
    if (!folder) return null;
    folderPath = folderPath || '/' + folder.getName();
    if (!isRoot(folder.getId())) {
      folder = folder.getParents().next();
      return gdrive.getPathByFolderId(folder.getId(), '/' + folder.getName() + folderPath);
    }
    return folderPath;
  },

  getPathByFileId: (id) => {
    const file = gdrive.getFileById(id);
    if (!file) return null;
    const parent = file.getParents().next();
    const path = gdrive.getPathByFolderId(parent.getId()) + '/' + file.getName();
    return path;
  },

  getDataByPath: (path, enc) => {
    const file = gdrive.getFileByPath(path);
    if (file) {
      let data = Buffer.from(expCall(file.getBlob).getBytes());
      return enc ? data.toString(enc) : data;
    }
    return null;
  },

  setContentByPath: (path, str) => {
    if (!isString(str)) throw Error('setContent parameter must be of type String');
    const file = gdrive.getFileByPath(path);
    if (file) {
      expCall(file.setContent, str);
      return file;
    }
    return null;
  },

  setDataByPath: (path = '', data, enc = 'utf8') => {
    if (!path) return null;
    path = resolve(path);
    const parsed = parse(path);
    const folder = gdrive.getFolderByPath(parsed.dir);
    if (folder) {
      const files = expCall(folder.getFilesByName, parsed.base);
      if (files.hasNext()) files.next().setTrashed(true);
      if (!Buffer.isBuffer(data)) data = Buffer.from(data, enc);
      const file = expCall(folder.createFile, Utilities.newBlob(data).setName(parsed.base));
      if (file) return file;
    }
    return null;
  },

  appendDataByPath: (path = '', data, enc = 'utf8') => {
    if (!path) return null;
    path = resolve(path);
    const parsed = parse(path);
    const folder = gdrive.getFolderByPath(parsed.dir);
    if (folder) {
      if (!Buffer.isBuffer(data)) data = Buffer.from(data, enc);
      const files = expCall(folder.getFilesByName, parsed.base);
      if (files.hasNext()) {
        const file = files.next();
        const oldData = Buffer.from(expCall(file.getBlob).getBytes());
        data = Buffer.concat([oldData, data]);
        file.setTrashed(true);
      }
      const file = expCall(folder.createFile, Utilities.newBlob(data).setName(parsed.base));
      if (file) return file;
    }
    return null;
  },

  // mkdirp
  newFolderByPath: (path = '') => {
    if (!path) return null;
    path = resolve(path);
    return path
      .split('/')
      .filter((parent) => parent !== 'My Drive')
      .filter(Boolean)
      .reduce((parent, child) => {
        if (!parent) return null;
        const folders = expCall(parent.getFoldersByName, child);
        let newChild = folders.hasNext() ? folders.next() : null;
        if (!newChild) {
          newChild = expCall(parent.createFolder, child);
        }
        return newChild;
      }, root);
  },

  rmFileByPath: (path) => {
    const file = gdrive.getFileByPath(path);
    if (file) {
      file.setTrashed(true);
      return true;
    }
    return null;
  },

  rmFolderByPath: (path) => {
    const folder = gdrive.getFolderByPath(path);
    if (folder) {
      folder.setTrashed(true);
      return true;
    }
    return null;
  },

  mvByPath: (oldPath, newPath) => {
    const src = gdrive.resolvePath(oldPath);
    oldPath = resolve(oldPath);
    if (!src)
      throw new SystemError(`path does not exist: ${oldPath}`, {
        errno: constants.ENOENT,
        code: 'ENOENT',
        path: oldPath,
      });
    let dest = gdrive.resolvePath(newPath);
    newPath = resolve(newPath);
    if (dest) {
      if (typeof dest.getMimeType === 'undefined')
        throw new SystemError(`directory already exists at destination: ${newPath}`, {
          errno: constants.EEXIST,
          code: 'EEXIST',
          path: newPath,
        });
      dest = src.getParents().next();
    } else {
      newPath = resolve(newPath);
      dest = gdrive.newFolderByPath(dirname(newPath));
    }
    if (!dest) throw Error(`could not create new Folder: ${dirname(newPath)}`);
    return expCall(src.moveTo, dest).setName(basename(newPath));
  },

  copyFileByPath: (src, dest, overwrite = false) => {
    const file = gdrive.getFileByPath(src);
    src = resolve(src);
    if (!file)
      throw new SystemError(`sorce file does not exist: ${src}`, {
        errno: constants.ENOENT,
        code: 'ENOENT',
        path: src,
      });
    dest = resolve(dest);
    const target = gdrive.getFileByPath(dest);
    if (target) {
      if (!overwrite) {
        throw new SystemError(`target file already exists: ${dest}`, {
          errno: constants.EEXIST,
          code: 'EEXIST',
          path: dest,
        });
      } else {
        var targetFolder = target.getParents().next();
        target.setTrashed(true);
      }
    } else {
      targetFolder = gdrive.getFolderByPath(dirname(dest));
    }
    return expCall(file.makeCopy, basename(dest), targetFolder);
  },

  statByPath: (path) => {
    const target = gdrive.resolvePath(path);
    if (target) {
      let dateLastUpdated = target.getLastUpdated(),
        dateCreated = target.getDateCreated();
      return {
        // see https://nodejs.org/api/fs.html#fs_class_fs_stats
        dev: 2114,
        ino: 48064969,
        mode: 33188,
        nlink: 1,
        uid: 85,
        gid: 100,
        rdev: 0,
        blksize: 4096,
        size: target.getSize(),
        blocks: 8,
        atime: dateLastUpdated,
        atimeMs: dateLastUpdated.getTime(),
        mtime: dateLastUpdated,
        mtimeMs: dateLastUpdated.getTime(),
        ctime: dateLastUpdated,
        ctimeMs: dateLastUpdated.getTime(),
        birthtime: dateCreated,
        birthtimeMs: dateCreated.getTime(),
        isDirectory: () => typeof target.getMimeType === 'undefined',
        isFile: () => typeof target.getMimeType !== 'undefined',
        id: target.getId(),
      };
    }
    return null;
  },
};

// do once to improve performance
const cwd = dirname(gdrive.getPathByFileId(getScriptId()));

(gdrive.cwd = () => cwd), (module.exports = gdrive);

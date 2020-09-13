// https://nodejs.org/api/errors.html#errors_common_system_errors

const xtend = /*prettier-ignore*/ (...args)=>{let t={};for(let n of args)for(let p in n)Object.prototype.hasOwnProperty.call(n,p)&&(t[p]=n[p]);return t};

function SystemError(message, { errno, code, syscall, path } = {}) {
  this.message = message;
  this.stack = Error().stack;
  this.errno = -errno;
  this.code = code;
  this.syscall = syscall;
  this.path = path;
}
SystemError.prototype = Object.create(Error.prototype);
SystemError.prototype.name = 'SystemError';

module.exports = {
  SystemError,
  constants: xtend(require('constants'), {
    COPYFILE_EXCL: 0x0001,
    COPYFILE_FICLONE: 0x0002,
    COPYFILE_FICLONE_FORCE: 0x0004,
  }),
};

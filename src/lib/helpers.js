const path = require('path');
const Buffer = require('safe-buffer').Buffer;
const isBuffer = require('is-buffer');

const e = (module.exports = {});

// h/t to https://www.npmjs.com/package/buffer-replace
e.breplace = /*prettier-ignore*/ (buf='',from='',to='')=>{isBuffer(buf)||(buf=Buffer.from(buf));const f=buf.indexOf(from);if(-1===f)return buf;isBuffer(to)||(to=Buffer.from(to));const r=buf.slice(0,f),n=e.breplace(buf.slice(f+from.length),from,to),c=f+to.length+n.length;return Buffer.concat([r,to,n],c)};
e.bappend = /*prettier-ignore*/ (buf='',str='')=>(isBuffer(buf)||(buf=Buffer.from(buf)),isBuffer(str)||(str=Buffer.from(str)),Buffer.concat([buf,str]));
e.bprepend = /*prettier-ignore*/ (buf='',str='')=>(isBuffer(buf)||(buf=Buffer.from(buf)),isBuffer(str)||(str=Buffer.from(str)),Buffer.concat([str,buf]));
e.cleanSrcBuf = /*prettier-ignore*/ (buf='')=>(isBuffer(buf)||(buf=Buffer.from(buf)),Buffer.from(buf.toString('utf8').replace(/^\ufeff/,'').replace(/^#![^\n]*\n/,'\n')));

e.has = (obj = {}, key = '') => obj && Object.prototype.hasOwnProperty.call(obj, key);
e.isObject = (obj) => !!obj && obj.constructor === Object;
e.isEmpty = (obj = {}) => e.isObject(obj) && Object.keys(obj).length === 0;

e.flattenArrOfObjArr = (arr = []) => [...arr].flat();
e.uniqArr = (arr = []) => [...new Set(arr)];
e.uniqArrayOfProp = (arr = [], prop = '') => [...new Set(arr.map((o) => o[prop]))];
e.uniqObjMap = (objArr = [], k = '') => new Map(objArr.map((m) => [m[k], m]));
e.uniqObjMapByProp = (objArr = [], k = '', prop = '') => new Map(objArr.map((m) => [m[k], m[prop]]));
e.mapToArr = (map = new Map()) => [...map.values()];
e.uniqObjArrByProp = (objArr = [], prop = '') => e.mapToArr(e.uniqObjMap(objArr, prop));
e.union = (arr1 = [], arr2 = []) => [...new Set([...arr1, ...arr2])];
e.diff = (arr1 = [], arr2 = []) => arr1.filter((x) => !new Set(arr2).has(x));
e.symDiff = (arr1 = [], arr2 = []) => e.diff(arr1, arr2).concat(e.diff(arr2, arr1));

e.mutateFilter = /*prettier-ignore*/ (arr,cb)=>{for(let t=arr.length-1;t>=0;t-=1)cb(arr[t])||arr.splice(t,1)};

e.missing = /*prettier-ignore*/ r=>{throw Error(`${r} parameter required`)};

e.isChildPath = /*prettier-ignore*/ (parent='',child='')=>{if(!parent||!child)return!1;const t=path.relative(path.normalize(parent),path.normalize(child));return t&&!t.startsWith('..')&&!path.isAbsolute(t)};

e.isString = (s) => s && (typeof s === 'string' || s instanceof String);
e.isUrl = (url = '') => /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/gi.test(url);
e.isBase64 = (v = '') => /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(v);
e.isJson = (filename = '') => /(\w*)\.json$/gi.test(filename);

// http://isthe.com/chongo/tech/comp/fnv/
e.fnv32a = /*prettier-ignore*/ (str='')=>{if(!str)return'';let t=2166136261;for(let r=0,e=str.length;r<e;r++)t^=str.charCodeAt(r),t+=(t<<1)+(t<<4)+(t<<7)+(t<<8)+(t<<24);return('0000000'+(t>>>0).toString(16)).substr(-8)};

e.xtend = /*prettier-ignore*/ (...args)=>{let t={};for(let n of args)for(let p in n)e.has(n,p)&&(t[p]=n[p]);return t};

e.makeEnum = (arr = []) => Object.freeze(arr.reduce((keys, key) => ({ ...keys, [key]: key }), {}));

e.rndint = (min = 0, max = 10) => Math.floor(Math.random() * (max - min + 1)) + min;

e.wrap = (value, func) => (...args) => func(value, ...args);

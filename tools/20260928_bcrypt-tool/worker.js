'use strict';

importScripts('./vendor/bcryptjs-3.0.3.umd.js', './bcrypt-core.js');

const core = self.BcryptToolCore;

const errorMessage = (error) => String(error?.message || error || '处理失败，请检查输入后重试。');

const postProgress = (id, progress) => {
  const number = Number(progress);
  self.postMessage({
    id,
    type: 'progress',
    progress: Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0,
  });
};

const requireBcrypt = () => {
  if (!self.bcrypt || typeof self.bcrypt.hash !== 'function' || typeof self.bcrypt.compare !== 'function') {
    throw new Error('本地 bcryptjs 依赖未能加载，请刷新页面或检查文件完整性。');
  }
  return self.bcrypt;
};

const requireSecureRandomness = () => {
  if (!self.crypto || typeof self.crypto.getRandomValues !== 'function') {
    throw new Error('当前浏览器不支持安全随机数，无法生成 Bcrypt Hash。');
  }
};

const generate = (id, data) => {
  core.validatePassword(data.password);
  const cost = core.validateCost(data.cost);
  const bcrypt = requireBcrypt();
  requireSecureRandomness();
  postProgress(id, 0);

  bcrypt.hash(data.password, cost, (error, hash) => {
    if (error) {
      self.postMessage({ id, type: 'error', message: errorMessage(error) });
      return;
    }
    postProgress(id, 1);
    self.postMessage({ id, type: 'result', hash });
  }, progress => postProgress(id, progress));
};

const verify = (id, data) => {
  core.validatePassword(data.password);
  const parsedHash = core.parseHash(data.hash);
  const bcrypt = requireBcrypt();
  postProgress(id, 0);

  bcrypt.compare(data.password, parsedHash.hash, (error, matched) => {
    if (error) {
      self.postMessage({ id, type: 'error', message: errorMessage(error) });
      return;
    }
    postProgress(id, 1);
    self.postMessage({ id, type: 'result', matched: Boolean(matched) });
  }, progress => postProgress(id, progress));
};

self.addEventListener('message', event => {
  const data = event.data || {};
  const id = data.id;

  try {
    if (data.mode === 'generate') {
      generate(id, data);
    } else if (data.mode === 'verify') {
      verify(id, data);
    } else {
      throw new Error('不支持的 Bcrypt 操作。');
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: errorMessage(error) });
  }
});

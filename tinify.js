const EventEmitter = require('events');
const tinify = require('tinify'); 
const chalk = require('chalk');
const fs = require('fs');

class Tinify extends EventEmitter {
  constructor(key) {
    super();
    this.key = key;
    this.initTinify();
  }

  initTinify () {
    tinify.key = this.key;
    tinify.validate((error) => {
      if (error) {
        // tinify 初始化验证失败
        this.emit('error', error);
        return process.exit();
      }
      if (this.remainingCompressions() <= 0) {
        console.log(chalk.red('压缩数量已经用完'));
        this.emit('close');
        return process.exit();
      }

      // 初始化验证成功
      this.emit('initial');
    });
  }

  // 计算剩余压缩张数
  remainingCompressions () {
    return 500 - tinify.compressionCount;
  }

  miniIMG (oldPath, newPath) {
    if (this.remainingCompressions() <= 0) {
      this.emit('error', Error({message: 'tinify has no remaining compressed sheets', name: 'TypeError'}));
      return process.exit();
    }

    return new Promise((resolve, reject) => {
      const rs = fs.createReadStream(oldPath);
      const ws = fs.createWriteStream(newPath);
      rs.on('data', (chunkData) => {
        tinify.fromBuffer(chunkData).toBuffer((error, chunk) => {
          if (error) return reject(error.message);
          ws.end(chunk);
          ws.on('finish', () => resolve());
          ws.on('err', () => reject(err.message));
        });
      });
    });
  }
}
module.exports = Tinify;

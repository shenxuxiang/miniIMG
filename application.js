const path = require('path');
const fs = require('fs');
const Tinify = require('./tinify');

class Application extends Tinify {
  constructor({key, entry, output}) {
    super(key);
    this.config = {
      key,
      entry,
      output,
      mime: /\.(png|jpg|gif|jpeg)$/,
    };
    // 创建一个堆栈，防止图片被重复执行压缩
    this.stack = new Set();
    // 做一个防抖处理
    this.fileChange = this.debounce(this.watchFileChange, 2000);

    // 当输入和输出的目录都创建完成以后，触发 runing，表示可以开始压缩了
    Promise.all([this.mkDir(this.config.entry), this.mkDir(this.config.output)])
      .then(() => {
        this.emit('running');
      })
      .catch((error) => {
        this.emit('error', error);
        process.exit();
      });
  }

  async mkDir (dir) {
    const exists = fs.existsSync(dir);
    if (exists) return;
    fs.mkdirSync(dir);
    return;
  }

  debounce (fn, delay) {
    let timer;
    return function() {
      const self = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(self, args);
      }, delay);
    }
  }

  // 监听
  watch (dir) {
    fs.watch(dir, {recursive: true}, (eventName) => {
      if (eventName === 'change') return;
      this.fileChange(dir);
    });
  }

  watchFileChange (dir) {
    // 读取该目录下的所有文件
    fs.readdir(dir, (error, files) => {
      if (error) {
        this.emit('error', error);
        return process.exit();
      }
      // 如果改目录是一个空目录，直接删除
      if (files.length === 0 && dir !== this.config.entry) {
        try {
          fs.rmdirSync(dir);
          return;
        } catch (err) {
          console.log(err);
        }
      }

      for (let i = 0; i < files.length; i++) {
        this.handleFile(dir, files[i]);
      }
    });
  }

  // 文件处理
  handleFile (dir, base) {
    const entryPath = path.join(dir, base);
    const outputPath = path.join(this.config.output, base);
    // 如果该文件还在 stack 中不会进行压缩
    if (this.stack.has(entryPath)) return;

    // 查看是否还有可压缩的次数
    if (this.remainingCompressions() <= 0) {
      this.emit('error', Error({message: 'tinify has no remaining compressed sheets', name: 'TypeError'}));
      return process.exit();
    }

    fs.stat(entryPath, (error, stat) => {
      if (error) {
        this.emit('error', error);
        return process.exit();
      }

      // 如果是一个文件目录，递归遍历该目录中的所有文件
      if (stat.isDirectory()) {
        this.watchFileChange(entryPath);
        return;
      };

      // 文件格式不符合；或者是一个空的文件；
      if (!this.config.mime.test(base) || stat.size <= 0) {
        try {
          fs.unlinkSync(entryPath);
          return;
        } catch (err) {
          console.log(err);
        }
      }

      // 将文件的路径作为该文件的唯一标示，存放在 stack 中；避免重复压缩；
      this.stack.add(entryPath);
      // 压缩图片
      this.miniIMG(entryPath, outputPath)
        .then(() => {
          // 压缩完成
          this.emit('complete', null, base);
          fs.unlink(entryPath, () => this.stack.delete(entryPath));
        })
        .catch(() => {
          // 压缩失败
          this.emit('complete', true, base);
          this.stack.delete(entryPath);
        });
    });
  }

  run () {
    this.prependOnceListener('running', () => {
      this.watch(this.config.entry);
    });
  }
}

module.exports = Application;
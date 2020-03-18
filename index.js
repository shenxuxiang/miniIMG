const Application = require('./application.js');
const chalk = require('chalk');
const params = require('./package.json');

const {key, entry, output} = {...params}
const app = new Application({key, entry, output});
app.run();

app.on('initial', () => {
  console.log('初始化验证成功了');
});

app.on('running', () => {
  console.log('应用已经开始了');
});

app.on('close', () => {
  console.log('应用关闭了');
});

app.on('error', (error) => {
  console.log('应用出错了', error);
});

app.on('complete', (err, filename) => {
  if (err) {
    console.log(chalk.red(`文件压缩失败【${filename}】`));
    return;
  }
  console.log(chalk.green(`文件压缩成功【${filename}】`));
});

// 处理未捕获的未知错误
process.on('uncaughtExpection', function(error) {
  // 打印日志
  console.log(error);
  process.exit();
});
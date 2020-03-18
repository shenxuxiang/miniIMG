const chalk = require('chalk');
const cluster = require('cluster');

const args = process.argv.slice(2);
const execArgv = process.execArgv;

cluster.setupMaster({'exec': './index.js', args, execArgv});


let worker = null;
const limit = 10;
const stack = [];
const stemp = 60000;

const createApplication = () => {
  stack.push(Date.now());
  worker = cluster.fork();
  worker.on('exit', (code, signal) => {
    console.log(code, signal);
    console.log(chalk.red(`工作进程【${worker.process.pid}】已经推出`));
    if (signal === 'SIGTERM' || signal === 'SIGHUB' || signal === 'SIGINT') return;

    // 限制频繁启动；这种场景一般出现在错误的程序中
    const lastStack = stack.slice(limit * -1);
    if (lastStack[lastStack.length - 1] - lastStack[0] < stemp) return;
    createApplication();
  })
}

createApplication();

// 当主进程推出时，关闭子进程
process.on('exit', () => {
  process.kill(worker.process.pid, 'SIGTERM');
})

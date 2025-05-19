// feedbackHandler.js
const { pigpio } = require('pigpio-client');

// 一、连接配置
const RPI_HOST = '::1';    // IPv6 回环地址
const RPI_PORT = 8888;    // pigpiod 默认 TCP 监听端口

const pi = pigpio({ host: RPI_HOST, port: RPI_PORT });
const buttonPins = [20, 21, 22, 23]; // BCM 编号
let pendingResolve = null;
const DEBOUNCE_MS = 50;      // 软件防抖阈值
const lastTick = new Array(buttonPins.length).fill(0);

// 二、连接成功后初始化 GPIO
pi.once('connected', async () => {
  console.log(`✅ 已连接到 pigpiod @ [${RPI_HOST}]:${RPI_PORT}`);
  await Promise.all(buttonPins.map(async (pin, idx) => {
    const btn = pi.gpio(pin);
    await btn.modeSet('input');       // 输入模式
    // 不再使用 glitchFilterSet/pullUpDownSet，改软件防抖
    btn.notify((level, tick) => {
      if (level === 1 && Date.now() - lastTick[idx] > DEBOUNCE_MS) {
        lastTick[idx] = Date.now();
        handlePress(idx, pin);
      }
    });
  }));
  console.log('🔧 GPIO 初始化完毕，开始监听...');
});

// 三、连接失败时记录并不阻塞
pi.once('error', err => {
  console.error('❌ pigpio-client 连接错误：', err);
});

/**
 * 根据索引与 BCM 引脚决定返回值
 * idx=0 → 1；idx=1 → 2；其它 → ignore
 */
function handlePress(idx, pin) {
  if (!pendingResolve) return;
  if (idx === 0) ret = 1;
  if (idx === 1) ret = 2
  if (ret !== null) {
    console.log(`📣 按钮${ret}（BCM${pin}）按下`);
    pendingResolve(ret);
    pendingResolve = null;
  }
}

/**
 * 返回 Promise：
 * - 按钮1 或 按钮2 按下时分别 resolve(1)、resolve(2)
 * - 5 秒后若未按下，resolve(0)
 */
function buttonFeedback() {
  return new Promise(resolve => {
    pendingResolve = resolve;
    setTimeout(() => {
      if (pendingResolve) {
        console.log('⏱ 超时 5 秒，无按钮按下 → 返回 0');
        pendingResolve(0);
        pendingResolve = null;
      }
    }, 5000);
  });
}

module.exports = { buttonFeedback };


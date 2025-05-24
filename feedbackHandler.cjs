// feedbackHandler.js
const { pigpio } = require('pigpio-client');

const RPI_HOST = '::1';
const RPI_PORT = 8888;
const buttonPins = [20, 21, 22, 23]; // BCM 编号

const DEBOUNCE_MS = 50;      // 软件去抖阈值（毫秒）
let pendingResolve = null;
const lastTick = new Array(buttonPins.length).fill(0);

const pi = pigpio({ host: RPI_HOST, port: RPI_PORT });

pi.once('connected', async () => {
  console.log(`✅ 已连接 pigpiod @ [${RPI_HOST}]:${RPI_PORT}]`);

  await Promise.all(buttonPins.map(async (pin, idx) => {
    const btn = pi.gpio(pin);
    await btn.modeSet('input');

    // 只用软件防抖：记录上次按下时刻
    btn.notify((level, tick) => {
      // 按高电平（1）为按下
      if (level === 1 && Date.now() - lastTick[idx] > DEBOUNCE_MS) {
        lastTick[idx] = Date.now();
        handlePress(idx, pin);
      }
    });
  }));

  console.log('🔧 GPIO 初始化完毕，开始监听按键');
});

pi.once('error', err => {
  console.error('❌ pigpio-client 连接失败：', err);
});

function handlePress(idx, pin) {
  if (!pendingResolve) return;
  const code = idx + 1; // idx=0→1, 1→2, 2→3, 3→4
  // console.log(`📣 按钮${code}（BCM${pin}）按下`);
  pendingResolve(code);
  pendingResolve = null;
}

/**
 * 等待按钮或超时，返回 0/1/2/3/4
 */
function buttonFeedback() {
  // **每次调用前** 清空旧的 pendingResolve，防止残留
  pendingResolve = null;

  return new Promise(resolve => {
    pendingResolve = resolve;
    setTimeout(() => {
      if (pendingResolve) {
        // console.log('⏱ 5s 超时，无按键 → 0');
        pendingResolve(0);
        pendingResolve = null;
      }
    }, 5000);
  });
}

module.exports = { buttonFeedback };

// renderer.js
;(async () => {
  //—— 全局状态 ——
  let firstTreeholeRecordId = 0;
  let bulletinListNumber = 0;
  let currentHtmlList = [];
  let currentIndex = 0;
  let currentScrollController = null;

  //—— 工具函数 ——
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  //—— 可取消滚动控制器 ——
  function createScrollController() {
    const abortController = new AbortController();
    let scrollInterval = null;
    
    const controller = {
      promise: new Promise(async (resolve) => {
        const signal = abortController.signal;
        
        // 滚动逻辑
        const startScroll = async () => {
          const maxY = document.body.scrollHeight - window.innerHeight;
          if (maxY <= 0) {
            await delay(5000);
            return resolve('complete');
          }
          
          let y = window.scrollY;
          scrollInterval = setInterval(async () => {
            if (signal.aborted) return cleanup('aborted');
            if (y >= maxY) {
                await delay(3000);
                return cleanup('complete');
            }
            window.scrollTo(0, ++y);
          }, 20);
        };

        // 按钮监听
        const startButtonListener = async () => {
          try {
            while (!signal.aborted) {
              const state = await Promise.race([
                window.sys.readButtons(),
                delay(50).then(() => null)
              ]);
              
              if ([3, 4, 1, 2].includes(state)) {
                resolve({ type: 'button', state });
                abortController.abort();
                break;
              }
            }
          } catch (err) {
            cleanup('error');
          }
        };

        // 清理逻辑
        const cleanup = (reason) => {
          clearInterval(scrollInterval);
          resolve(reason);
        };

        startScroll();
        startButtonListener();
      }),
      
      cancel: () => {
        abortController.abort();
        clearInterval(scrollInterval);
      }
    };

    return controller;
  }

  //—— 数据获取 ——
  async function fetchData() {
    try {
      let [bullets, holes] = await Promise.all([
        fetch('http://152.32.175.98:3000/api/GetLatestRecord')
          .then(res => res.json())
          .then(data => data.map(item => 
            `<div><h1 id="heading">公告</h1>${item}</div>`
          )),
        
        fetch('http://152.32.175.98:3000/api/GetTreeholeRecord')
          .then(res => res.json())
          .then(data => {
            let fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            fiveDaysAgo = fiveDaysAgo.getTime();
            return data
              .filter((item) => {
                const itemDate = (new Date(item.timestamp)).getTime();
                console.log(itemDate, fiveDaysAgo);
                return itemDate >= fiveDaysAgo;
              });
          })
      ]);

      bulletinListNumber = bullets.length;
      firstTreeholeRecordId = holes.length ? Math.min(...holes.map(it => it.id)) : 0;
      holes = holes.map(it => `
                <div>
                  <div id="heading">树洞</div>
                  <div>${new Date(it.timestamp).toLocaleString('zh-Hans-CN')}</div>
                  ${it.html}
                  <div id="feedback">👍${it.feedback.positive} | 👎${it.feedback.negative}</div>
                </div>
              `);
      
      return [...bullets, ...holes];
    } catch (err) {
      console.error('数据加载失败:', err);
      return currentHtmlList; // 保留现有数据
    }
  }

  //—— 反馈提交 ——
  async function sendFeedback(id, isPositive) {
    try {
      await fetch('http://152.32.175.98:3000/api/treeholeFeedbackInc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPositive })
      });
    } catch (err) {
      console.error('反馈提交失败:', err);
    }
  }

  //—— 主显示逻辑 ——
  async function showPage() {
    const container = document.getElementById('device-emulator');
    
    while (true) {
      // 等待有效数据
      if (!currentHtmlList.length) {
        await delay(500);
        continue;
      }

      // 终止前一个滚动
      if (currentScrollController) {
        currentScrollController.cancel();
        await currentScrollController.promise.catch(() => {});
      }

      // 更新显示内容
      const len = currentHtmlList.length;
      currentIndex = (currentIndex + len) % len; // 标准化索引
      container.innerHTML = currentHtmlList[currentIndex];
      window.scrollTo(0, 0);

      // 启动新滚动
      currentScrollController = createScrollController();
      
      // 等待交互
      const result = await currentScrollController.promise;

      // 处理交互结果
      if (result.state) {
        switch (result.state !== 0 && result.state) {
          case 3: // 上一页
            currentIndex = (currentIndex - 1 + len) % len;
            break;
          case 4: // 下一页
            currentIndex = (currentIndex + 1) % len;
            break;
          case 1: // 点赞
          case 2: // 差评
            if (currentIndex >= bulletinListNumber) {
              const feedbackId = firstTreeholeRecordId + (currentIndex - bulletinListNumber);
              await sendFeedback(feedbackId, result.state === 1);
              
              const feedbackEl = document.createElement('div');
              feedbackEl.id = 'feedbackNotice';
              feedbackEl.textContent = '感谢反馈';
              container.appendChild(feedbackEl);
              await delay(1000);
              feedbackEl.remove();
            }
            currentIndex = (currentIndex + 1) % len;
            break;
        }
      } else {
        // 自动翻页
        currentIndex = (currentIndex + 1) % len;
      }
    }
  }

  //—— 数据自动刷新 ——
  (async () => {
    while (true) {
      try {
        const newData = await fetchData();
        if (JSON.stringify(newData) !== JSON.stringify(currentHtmlList)) {
          currentHtmlList = newData;
          currentIndex = 0;
        }
      } catch (err) {
        console.error('数据刷新失败:', err);
      }
      await delay(8000);
    }
  })();

  //—— 初始化 ——
  currentHtmlList = await fetchData();
  showPage().catch(err => console.error('主循环异常:', err));
})();

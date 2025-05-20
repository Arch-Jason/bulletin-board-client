let firstTreeholeRecordId = 0;
let bulletinListNumber = 0;

async function fetchData() {
    try {
        const htmlResponse = await fetch(
            `http://152.32.175.98:3000/api/GetLatestRecord`
        );
        const htmlData = await htmlResponse.json();
        bulletinListNumber = htmlData.length;
        const treeholeHttpResponse = await fetch(
            `http://152.32.175.98:3000/api/GetTreeholeRecord`
        );

        const treeholeHtmlData = await treeholeHttpResponse.json();

        // 获取当前日期
        const currentDate = new Date();
        // 计算5天前的日期
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(currentDate.getDate() - 5);

        // 过滤出5天内的记录
        const filteredTreeholeData = treeholeHtmlData.filter((item) => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= fiveDaysAgo;
        });

        const treeholeHtmlDataList = filteredTreeholeData.map(
            (item) =>
                `<div>${new Date(item.timestamp).toLocaleString(
                    "zh-Hans-CN"
                )}</div> <br />` + item.html + `<div id="feedback">👍${item.feedback.positive} | 👎${item.feedback.negative}</div>`
        );

        firstTreeholeRecordId = Math.min(...filteredTreeholeData.map(
            (item) => parseInt(item.id)
        ))

        return [...htmlData, ...treeholeHtmlDataList];
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

async function sendFeedback(id, isPositive) {
    const body = {
        id: id,
        isPositive: isPositive
    };
    console.log(id)

    try {
        const response = await fetch(
            "http://152.32.175.98:3000/api/treeholeFeedbackInc",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        if (response.ok) {
            console.log("Feedback updated successfully");
        } else {
            console.error("Failed to update feedback");
        }
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

function autoScroll() {
    const scrollSpeed = 1; // 每次滚动的像素
    const scrollInterval = 20; // 每多少毫秒滚动一次

    const scrollDown = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      let currentScroll = window.scrollY;

      const interval = setInterval(() => {
        if (currentScroll < maxScroll) {
          currentScroll += scrollSpeed;
          window.scrollTo(0, currentScroll);
        } else {
          clearInterval(interval); // 滚动到底后停止
        }
      }, scrollInterval);
    };
    scrollDown();
}

function init() {
    let currentHtmlList = [];

    let currentIndex = 0;

	const updateContent = async () => {
            if (currentHtmlList.length === 0) {
                return;
            }
        
	    const container = document.getElementById("device-emulator");
            container.innerHTML = currentHtmlList[currentIndex];
            window.scrollTo(0, 0); // 重置滚动到顶部
        
            // 启动自动滚动（并行异步，不阻塞按钮检测）
            autoScroll();
        
            // 启动按钮检测（不依赖滚动完成）
            if (currentIndex >= bulletinListNumber) {
                const id = firstTreeholeRecordId + currentIndex - bulletinListNumber;
        
                // 异步独立执行按钮检测
                (async () => {
		    const container = document.getElementById("device-emulator");
		    const containerEl = document.getElementById("device-emulator");
                    try {
                        const buttonStates = await window.sys.readButtons();
                        if (buttonStates === 1) {
			    // 插入提示
                            containerEl.innerHTML += '<div id="feedbackNotice">感谢反馈</div>'
                            
                            // 延迟移除
                            setTimeout(() => {
                              const noticeEl = document.getElementById("feedbackNotice");
                              if (noticeEl) noticeEl.remove();
                            }, 1000);
			    sendFeedback(id, true);
                        } else if (buttonStates === 2) {
			    // 插入提示
                            containerEl.innerHTML += '<div id="feedbackNotice">感谢反馈</div>'
                            
                            // 延迟移除
                            setTimeout(() => {
                              const noticeEl = document.getElementById("feedbackNotice");
                              if (noticeEl) noticeEl.remove();
                            }, 1000);
			    sendFeedback(id, true);
                        }
                    } catch (err) {
                        console.error("按钮读取失败", err);
                    }
                })();
            }
        
            currentIndex = (currentIndex + 1) % currentHtmlList.length;
        };


    let updateContentInterval = setInterval(updateContent, 5000);

    const updateFetchData = async () => {
        const htmlList = await fetchData();
        if (JSON.stringify(htmlList) !== JSON.stringify(currentHtmlList)) {
            currentHtmlList = htmlList;
            clearInterval(updateContentInterval);
            updateContentInterval = setInterval(updateContent, 8000);
        }
    };

    setInterval(updateFetchData, 8000);
}

window.onload = () => {
    init();
};

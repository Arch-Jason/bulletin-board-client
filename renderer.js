let firstTreeholeRecordId = 0;
let bulletinListNumber = 0;

async function fetchData() {
    try {
        const htmlResponse = await fetch(
            `http://localhost:3000/api/GetLatestRecord`
        );
        const htmlData = await htmlResponse.json();
        bulletinListNumber = htmlData.length;
        const treeholeHttpResponse = await fetch(
            `http://localhost:3000/api/GetTreeholeRecord`
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
                )}</div> <br />` + item.html + `<div>👍${item.feedback.positive} | 👎${item.feedback.negative}</div>`
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
            "http://localhost:3000/api/treeholeFeedbackInc",
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

function init() {
    let currentHtmlList = [];

    const container = document.getElementById("device-emulator");
    let currentIndex = 0;

    const updateContent = async () => {
        if (currentHtmlList.length === 0) {
            return;
        }
        container.innerHTML = currentHtmlList[currentIndex];

        // read button states
        if (currentIndex > bulletinListNumber - 1) {
            console.log(firstTreeholeRecordId, currentIndex, bulletinListNumber)
            const id = firstTreeholeRecordId + currentIndex - bulletinListNumber
            if (await window.sys.readButtons() === 1) {
                sendFeedback(id, true)
            } else if (await window.sys.readButtons() === 2) {
                sendFeedback(id, false)
            }
        }

        currentIndex = (currentIndex + 1) % currentHtmlList.length;
    };

    let updateContentInterval = setInterval(updateContent, 5000);

    const updateFetchData = async () => {
        const htmlList = await fetchData();
        if (JSON.stringify(htmlList) !== JSON.stringify(currentHtmlList)) {
            currentHtmlList = htmlList;
            clearInterval(updateContentInterval);
            updateContentInterval = setInterval(updateContent, 5000);
        }
    };

    setInterval(updateFetchData, 1000);
}

window.onload = () => {
    init();
};

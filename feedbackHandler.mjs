import fs from "fs"

export function buttonFeedback() {
    return new Promise((resolve, reject) => {
        fs.readFile('./dummyButtons.txt', 'utf8', (err, data) => {
            if (err) {
                console.error(err);
                reject(0);
            } else {
                if (data.includes("1")) resolve(1);
                else if (data.includes("2")) resolve(2);
                else resolve(0);
            }
        });
    });
}
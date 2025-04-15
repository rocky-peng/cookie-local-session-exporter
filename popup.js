// 通用下载函数（复用）
const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// 导出 localStorage/sessionStorage（原逻辑优化）
const exportStorage = async (type) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (storageType) => {
                const storage = storageType === 'local' ? localStorage : sessionStorage;
                const data = {};
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    data[key] = storage.getItem(key);
                }
                return { data, url: location.href, timestamp: new Date().toISOString() };
            },
            args: [type]
        });

        const { data, url, timestamp } = result[0].result;
        if (!data) throw new Error('无数据');
        downloadJSON(
            { [type]: data, url, timestamp },
            `${type}_storage_${new Date(timestamp).toISOString().slice(0, 10)}.json`
        );

    } catch (error) {
        alert(`导出失败: ${error.message}`);
    }
};

// 新增：导出 Cookie 逻辑
const exportCookies = async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 获取当前页面的所有 Cookie
        const cookies = await chrome.cookies.getAll({ url: tab.url });
        if (cookies.length === 0) throw new Error('无 Cookie 数据');

        const data = {
            cookies: cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expirationDate,
                secure: cookie.secure
            })),
            url: tab.url,
            timestamp: new Date().toISOString()
        };

        downloadJSON(
            data,
            `cookies_${new Date().toISOString().slice(0, 10)}.json`
        );

    } catch (error) {
        alert(`导出失败: ${error.message}`);
    }
};

// 终极奥义：同时扒三层裤子
const exportAllStorage = async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // 同时扒取 localStorage 和 sessionStorage
        const storageResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
                local: Object.fromEntries(Object.entries(localStorage)),
                session: Object.fromEntries(Object.entries(sessionStorage)),
                url: location.href
            })
        });

        // 单独扒 Cookie 的裤子
        const cookies = await chrome.cookies.getAll({ url: tab.url });

        // 组装成超级大裤衩
        const allData = {
            localStorage: storageResult[0].result.local,
            sessionStorage: storageResult[0].result.session,
            cookies: cookies.map(cookie => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expirationDate,
                secure: cookie.secure
            })),
            timestamp: new Date().toISOString(),
            url: storageResult[0].result.url
        };

        // 给大裤衩拍个X光片
        downloadJSON(
            allData,
            `all_storage_${Date.now()}.json`
        );

    } catch (error) {
        alert(`扒裤失败！原因：${error.message}`);
    }
};

// 绑定所有按钮事件
document.getElementById('exportLocal').addEventListener('click', () => exportStorage('local'));
document.getElementById('exportSession').addEventListener('click', () => exportStorage('session'));
document.getElementById('exportCookie').addEventListener('click', exportCookies); // 新增绑定
document.getElementById('exportAll').addEventListener('click', exportAllStorage);
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
            `storage_${type}_${new Date(timestamp).toISOString().slice(0, 10)}.json`
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

// 绑定所有按钮事件
document.getElementById('exportLocal').addEventListener('click', () => exportStorage('local'));
document.getElementById('exportSession').addEventListener('click', () => exportStorage('session'));
document.getElementById('exportCookie').addEventListener('click', exportCookies); // 新增绑定
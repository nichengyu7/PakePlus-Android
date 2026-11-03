window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })

// ==================== 新增：抖音自动最高画质（精准文本匹配版） ====================
(function() {
    'use strict';

    // 按优先级排列的目标画质（越靠前越优先）
    const TARGET_QUALITIES = [
        '超清 4K', '超清 2K', '蓝光', '原画', 
        '超清', '高清 1080P', '1080P', 
        '高清 720P', '720P', '高清'
    ];

    let isProcessing = false;

    /**
     * 深度查找页面上可见的、文本完全匹配的元素（针对“智能”按钮和画质选项）
     */
    function findVisibleElementByExactText(textList) {
        // 遍历所有可能承载文字的容器
        const elements = document.querySelectorAll('div, span, li, button, a, p');
        for (let el of elements) {
            // 必须是可见的，并且没有复杂的子元素（避免匹配到整个控制栏）
            if (el.offsetParent !== null && el.children.length === 0) {
                const text = el.innerText.trim();
                if (textList.includes(text)) {
                    return el;
                }
            }
        }
        return null;
    }

    /**
     * 处理点播视频画质
     */
    function applyVodQuality() {
        // 1. 寻找底部控制栏的“智能”按钮
        const smartBtn = findVisibleElementByExactText(['智能']);
        
        if (!smartBtn) return; // 没找到说明没在播放状态或按钮未加载

        // 2. 点击“智能”打开菜单
        smartBtn.click();

        // 3. 等待菜单渲染出来
        setTimeout(() => {
            // 在全局寻找目标画质选项（因为弹窗通常是挂载在 body 下的）
            const targetQualityEl = findVisibleElementByExactText(TARGET_QUALITIES);
            
            if (targetQualityEl) {
                const chosenText = targetQualityEl.innerText.trim();
                targetQualityEl.click();
                console.log('[Douyin AutoQuality] 成功切换视频画质至:', chosenText);
            } else {
                console.log('[Douyin AutoQuality] 未找到更高的画质选项，或菜单未弹出');
                // 如果没有找到目标，点击空白处或再次点击“智能”收回菜单
                smartBtn.click(); 
            }
        }, 300); // 300ms 等待菜单动画
    }

    /**
     * 处理直播画质
     */
    function applyLiveQuality() {
        // 直播的入口不一定是“智能”，可能是直接显示当前画质如“高清”或“原画”
        // 我们先寻找是否已经有画质菜单打开着，如果没有，找触发按钮
        let qualityBtn = null;
        
        // 尝试找包含“原画”、“蓝光”、“高清”等字样的底部按钮
        const possibleBtnTexts = ['智能', '原画', '蓝光', '超清', '高清', '标清'];
        const allElements = document.querySelectorAll('div, span');
        
        for (let el of allElements) {
            if (el.offsetParent !== null && el.children.length === 0) {
                const text = el.innerText.trim();
                // 只要精确匹配到按钮文本，且不是菜单里的选项（通常菜单项更长）
                if (possibleBtnTexts.includes(text)) {
                    // 检查它是否在当前屏幕的下半部分（控制栏区域）
                    const rect = el.getBoundingClientRect();
                    if (rect.top > window.innerHeight * 0.7) {
                        qualityBtn = el;
                        break;
                    }
                }
            }
        }

        if (!qualityBtn) return;

        qualityBtn.click(); // 点开菜单

        setTimeout(() => {
            const targetQualityEl = findVisibleElementByExactText(TARGET_QUALITIES);
            if (targetQualityEl) {
                targetQualityEl.click();
                console.log('[Douyin AutoQuality] 成功切换直播画质至:', targetQualityEl.innerText.trim());
            }
        }, 300);
    }

    /**
     * 主调度器
     */
    function processPage() {
        if (isProcessing) return;
        isProcessing = true;

        // 给页面留出响应时间，3秒后解锁，防止频繁点击
        setTimeout(() => { isProcessing = false; }, 3000); 

        // 判断是否在直播页面
        const isLive = window.location.hostname === 'live.douyin.com' || 
                       window.location.pathname.includes('/live/') || 
                       document.querySelector('[class*="live-room"]') !== null;

        if (isLive) {
            applyLiveQuality();
        } else if (document.querySelector('video')) {
            applyVodQuality();
        }
    }

    /**
     * 初始化与监听逻辑
     */
    function init() {
        // 首次进入延迟 2 秒执行，等待视频播放器加载完毕
        setTimeout(processPage, 2000);

        // 监听 SPA 路由变化和 DOM 变化（比如上下滑动切换视频）
        let observerTimeout = null;
        const observer = new MutationObserver(() => {
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                processPage();
            }, 1000); // 1秒防抖，避免视频滑动时疯狂触发
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 监听 URL 变化（部分 SPA 路由跳转不触发 DOM 突变）
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(processPage, 1500);
            }
        }, 1000);
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

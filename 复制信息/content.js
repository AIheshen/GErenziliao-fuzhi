// === V14.2 长文本优化版：支持自动换行与长段落 ===
let currentData = [];
let activeTemplateIndex = 0;
let hostElement = null;
let shadowRoot = null;
let uiContainer = null;
let tooltipEl = null; 

const ICONS = {
  drag: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="rgba(255,255,255,0.8)" stroke-width="2" fill="none"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line></svg>`,
  logo: `<svg viewBox="0 0 24 24" width="26" height="26" stroke="white" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

function init() {
  loadDataAndRender();
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.userData) currentData = changes.userData.newValue;
    if (changes.activeTemplateIndex !== undefined) activeTemplateIndex = changes.activeTemplateIndex.newValue;
    updateContent();
  });
}

function loadDataAndRender() {
  chrome.storage.local.get(['userData', 'activeTemplateIndex'], (result) => {
    if (result.userData && result.userData.length > 0) {
      currentData = result.userData;
    } else {
      currentData = [{ name: "加载中...", items: [] }];
    }
    activeTemplateIndex = result.activeTemplateIndex || 0;
    if (activeTemplateIndex >= currentData.length) activeTemplateIndex = 0;
    mountWidget();
  });
}

function mountWidget() {
  if (hostElement && hostElement.isConnected) return;
  
  hostElement = document.createElement('div');
  hostElement.id = 'info-helper-v14-opt';
  hostElement.style.cssText = `all: initial !important; position: fixed !important; z-index: 2147483647 !important; top: 0; left: 0; pointer-events: none; width: 100vw; height: 100vh;`;
  
  document.documentElement.appendChild(hostElement);
  shadowRoot = hostElement.attachShadow({ mode: 'open' });
  
  renderStyles();
  renderDomStructure();
  
  const observer = new MutationObserver(() => {
    if (!document.getElementById('info-helper-v14-opt')) mountWidget();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function renderStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif; }
    * { box-sizing: border-box; user-select: none; }

    #container {
      pointer-events: auto; position: fixed; top: 100px; left: 20px;
      width: 170px;
      background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
      backdrop-filter: blur(12px);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1) inset;
      display: flex; flex-direction: column;
      opacity: 0; animation: fadeIn 0.4s forwards;
      color: #fff; overflow: hidden;
    }

    #header {
      padding: 0 10px;
      background: linear-gradient(90deg, #3b82f6, #6366f1);
      display: flex; align-items: center; gap: 8px;
      cursor: grab; height: 46px;
    }
    #header:active { cursor: grabbing; }

    #tpl-select {
      flex: 1; background: rgba(0,0,0,0.2); color: white;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 6px;
      padding: 4px; font-size: 13px; font-weight: 500;
      outline: none; cursor: pointer; height: 26px;
    }
    #tpl-select option { background: #1e293b; color: white; }

    #btn-min {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; background: rgba(255,255,255,0.2);
      font-weight: bold; font-size: 16px; transition: 0.2s;
    }
    #btn-min:hover { background: rgba(255,255,255,0.4); }

    #list-box {
      padding: 12px; display: flex; flex-direction: column; gap: 8px;
      max-height: 65vh; overflow-y: auto; scrollbar-width: none;
    }
    #list-box::-webkit-scrollbar { display: none; }

    /* 按钮样式：保持之前的绝对居中修复 */
    .row-item {
      display: flex; justify-content: center; align-items: center;
      height: 38px;
      background: rgba(255,255,255,0.06);
      padding: 0 8px; border-radius: 8px;
      font-size: 14px; font-weight: 500;
      color: #e2e8f0; cursor: pointer;
      border: 1px solid transparent; transition: all 0.2s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .row-item:hover {
      background: rgba(59,130,246,0.25); color: white; border-color: #6366f1;
      transform: translateY(-1px);
    }
    .row-item.copied { background: #10b981 !important; color: white; border-color: #10b981; }

    /* === 核心优化：气泡样式支持长文本 === */
    #global-tooltip {
      position: fixed; 
      background: rgba(0, 0, 0, 0.95);
      color: #fff; 
      padding: 12px 16px; /* 增加内边距 */
      border-radius: 8px;
      font-size: 14px; 
      
      /* 这里的修改实现了自动换行 */
      white-space: pre-wrap;   /* 保留换行符，并允许自动换行 */
      word-break: break-word;  /* 长单词（如URL）强制换行 */
      max-width: 320px;        /* 限制最大宽度，防止太宽 */
      line-height: 1.6;        /* 增加行高，提升阅读体验 */
      
      pointer-events: none;
      opacity: 0; transition: opacity 0.1s;
      box-shadow: 0 6px 24px rgba(0,0,0,0.6);
      border: 1px solid #475569; z-index: 2147483647;
      transform: translateY(-50%); left: -9999px;
    }
    #global-tooltip::before {
      content: ''; position: absolute; top: 50%; right: 100%; margin-top: -6px;
      border-width: 6px; border-style: solid;
      border-color: transparent rgba(0,0,0,0.95) transparent transparent;
    }

    #container.collapsed {
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      justify-content: center; align-items: center; padding: 0; cursor: pointer;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.6);
    }
    #container.collapsed > *:not(#logo-icon) { display: none; }
    #logo-icon { display: none; }
    #container.collapsed #logo-icon { display: block; animation: popIn 0.3s; }

    #toast {
      background: #10b981; color: white; text-align: center; padding: 6px;
      font-size: 12px; border-radius: 0 0 14px 14px;
      opacity: 0; transition: opacity 0.2s; font-weight: 500;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
  `;
  shadowRoot.appendChild(style);
}

function renderDomStructure() {
  uiContainer = document.createElement('div');
  uiContainer.id = 'container';
  shadowRoot.appendChild(uiContainer);
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'global-tooltip';
  shadowRoot.appendChild(tooltipEl);

  chrome.storage.local.get(['posX', 'posY', 'isCollapsed'], (res) => {
    if (res.posX) uiContainer.style.left = res.posX + 'px';
    if (res.posY) uiContainer.style.top = res.posY + 'px';
    if (res.isCollapsed) uiContainer.classList.add('collapsed');
  });

  updateContent();
  enableSmoothDrag(uiContainer);
}

function updateContent() {
  if (!uiContainer) return;
  
  if (!uiContainer.querySelector('#header')) {
    uiContainer.innerHTML = `
      <div id="header">
        <div style="opacity:0.8; display:flex;">${ICONS.drag}</div>
        <select id="tpl-select" title="切换模板"></select>
        <div id="btn-min" title="收起">－</div>
      </div>
      <div id="list-box"></div>
      <div id="toast">已复制</div>
      <div id="logo-icon">${ICONS.logo}</div>
    `;

    const sel = uiContainer.querySelector('#tpl-select');
    sel.onmousedown = e => e.stopPropagation();
    sel.onchange = (e) => {
      activeTemplateIndex = parseInt(e.target.value);
      chrome.storage.local.set({ activeTemplateIndex });
      renderListItems();
    };

    uiContainer.querySelector('#btn-min').onmousedown = e => e.stopPropagation();
    uiContainer.querySelector('#btn-min').onclick = () => toggle(true);
    uiContainer.querySelector('#logo-icon').onclick = () => toggle(false);
  }

  const sel = uiContainer.querySelector('#tpl-select');
  sel.innerHTML = '';
  currentData.forEach((tpl, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.text = tpl.name;
    if (idx === activeTemplateIndex) opt.selected = true;
    sel.appendChild(opt);
  });

  renderListItems();
}

function renderListItems() {
  const listBox = uiContainer.querySelector('#list-box');
  listBox.innerHTML = '';
  const items = currentData[activeTemplateIndex]?.items || [];

  if(items.length === 0) {
    listBox.innerHTML = '<div style="color:#aaa; text-align:center; padding:10px; font-size:12px;">暂无数据</div>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'row-item';
    row.innerText = item.label;
    
    // 气泡
    row.onmouseenter = () => {
      tooltipEl.innerText = item.value;
      const rect = row.getBoundingClientRect();
      
      // 垂直居中对齐
      let topPos = rect.top + rect.height / 2;
      
      // 简单的边界检查（如果气泡底部超出屏幕，稍微往上提一点）
      // 这里保持简单逻辑，主要依靠 fixed 定位
      tooltipEl.style.top = topPos + 'px';
      tooltipEl.style.left = (rect.right + 12) + 'px';
      tooltipEl.style.opacity = '1';
    };
    row.onmouseleave = () => { tooltipEl.style.opacity = '0'; };
    window.onscroll = () => { tooltipEl.style.opacity = '0'; };

    // 复制
    row.onclick = () => {
      navigator.clipboard.writeText(item.value).then(() => {
        row.classList.add('copied');
        const oldText = row.innerText;
        row.innerText = "已复制";
        setTimeout(() => {
          row.classList.remove('copied');
          row.innerText = oldText;
        }, 800);
        const t = uiContainer.querySelector('#toast');
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 1500);
      });
    };
    listBox.appendChild(row);
  });
}

function toggle(collapsed) {
  if (collapsed) {
    uiContainer.classList.add('collapsed');
    tooltipEl.style.opacity = '0';
    chrome.storage.local.set({ isCollapsed: true });
  } else {
    uiContainer.classList.remove('collapsed');
    chrome.storage.local.set({ isCollapsed: false });
  }
}

function enableSmoothDrag(el) {
  let isDragging = false;
  let offsetX, offsetY;
  const onMouseDown = (e) => {
    const header = el.querySelector('#header');
    const isCollapsed = el.classList.contains('collapsed');
    if (!isCollapsed && !e.composedPath().includes(header)) return;
    if (['SELECT', 'OPTION'].includes(e.target.tagName)) return;
    if (e.target.id === 'btn-min') return;
    isDragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    if(header) header.style.cursor = 'grabbing';
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    el.style.left = (e.clientX - offsetX) + 'px';
    el.style.top = (e.clientY - offsetY) + 'px';
    tooltipEl.style.opacity = '0';
  };
  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      const header = el.querySelector('#header');
      if(header) header.style.cursor = 'grab';
      const rect = el.getBoundingClientRect();
      chrome.storage.local.set({ posX: rect.left, posY: rect.top });
    }
  };
  el.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
init();
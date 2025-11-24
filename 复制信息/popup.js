// === V14.0 核心配置 ===
const mergedData = [
  {
    name: "我的全部信息", // 默认只有一个模板，但包含所有内容
    items: [
      // --- 身份信息 ---
      { label: "姓名", value: "努尔艾合买提·库完" },
      { label: "身份证", value: "653127200003200936" },
      { label: "手机号", value: "15684141276" },
      { label: "邮箱", value: "15684141276@163.com" },
      { label: "微信号", value: "nt20000320" },
      { label: "民族", value: "维吾尔" },
      { label: "政治面貌", value: "共青团员" },
      { label: "籍贯", value: "新疆喀什" },
      { label: "出生日期", value: "2000.03.20" },
      // --- 地址学历 ---
      { label: "户籍地址", value: "新疆麦盖提县吐曼塔勒乡库如克鲁克村2组72号" },
      { label: "毕业院校", value: "上海海洋大学" },
      { label: "所学专业", value: "电气工程及其自动化" },
      { label: "学历层次", value: "本科" },
      { label: "入学时间", value: "2020.10" },
      { label: "毕业时间", value: "2026.07" },
      // --- 经历技能 ---
      { label: "英语水平", value: "CET-4 (420分)" },
      { label: "驾驶证", value: "C1" },
      { label: "服役部队", value: "中国人民解放军69250部队" },
      { label: "服役职位", value: "车载加榴炮/炮手" },
      { label: "服役时间", value: "2021.03 - 2023.03" },
      { label: "荣誉奖项", value: "十佳新兵, 优秀新兵, 神炮手, 四有优秀士兵" },
      { label: "自我评价", value: "政治立场坚定，思想觉悟过硬。具备独立研究与实践经验。部队服役经历锻造了我极强的执行力与抗压能力。" }
    ]
  }
];

let userData = [];
let activeIdx = 0;
const selector = document.getElementById('tpl-select');
const itemsList = document.getElementById('items-list');

// 初始化
chrome.storage.local.get(['userData', 'activeTemplateIndex'], (res) => {
  // 如果没有数据，或者数据格式不对，加载默认的一套全量数据
  if (!res.userData || !Array.isArray(res.userData) || res.userData.length === 0) {
    userData = JSON.parse(JSON.stringify(mergedData));
    activeIdx = 0;
    saveData();
  } else {
    userData = res.userData;
    activeIdx = res.activeTemplateIndex || 0;
  }
  renderUI();
});

function renderUI() {
  selector.innerHTML = '';
  userData.forEach((tpl, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.text = tpl.name;
    if (idx === activeIdx) opt.selected = true;
    selector.appendChild(opt);
  });
  renderList();
}

function renderList() {
  itemsList.innerHTML = '';
  // 容错：防止索引越界
  if(!userData[activeIdx]) activeIdx = 0;
  
  const items = userData[activeIdx].items;
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'row-card';
    row.innerHTML = `
      <input class="inp-label" placeholder="标签" value="${item.label}">
      <input class="inp-value" placeholder="内容" value="${item.value}">
      <button class="btn-del" title="删除">×</button>
    `;
    
    row.querySelector('.inp-label').oninput = (e) => { userData[activeIdx].items[idx].label = e.target.value; saveData(false); };
    row.querySelector('.inp-value').oninput = (e) => { userData[activeIdx].items[idx].value = e.target.value; saveData(false); };
    row.querySelector('.btn-del').onclick = () => {
      userData[activeIdx].items.splice(idx, 1);
      saveData();
      renderList();
    };
    itemsList.appendChild(row);
  });
}

// === 功能区：保留所有增删改查功能 ===

selector.onchange = (e) => { activeIdx = parseInt(e.target.value); saveData(); renderList(); };

document.getElementById('add-tpl').onclick = () => {
  const name = prompt("新建模板名称（如：购物地址）:");
  if(name) { userData.push({name, items:[]}); activeIdx=userData.length-1; saveData(); renderUI(); }
};

document.getElementById('rename-tpl').onclick = () => {
  const name = prompt("重命名当前模板:", userData[activeIdx].name);
  if(name) { userData[activeIdx].name=name; saveData(); renderUI(); }
};

document.getElementById('del-tpl').onclick = () => {
  if(confirm("确定删除当前模板？")) {
    userData.splice(activeIdx, 1);
    // 如果删光了，恢复一个空的默认模板
    if(userData.length === 0) userData.push({name: "默认模板", items: []});
    activeIdx = 0;
    saveData();
    renderUI();
  }
};

document.getElementById('add-item').onclick = () => {
  userData[activeIdx].items.push({label:"",value:""});
  renderList(); setTimeout(()=>itemsList.scrollTop=itemsList.scrollHeight,10); saveData();
};

// *** 恢复默认数据 (一键合并所有数据) ***
document.getElementById('btn-reset').onclick = () => {
  if(confirm("确定要重置为【合并单列】的个人信息？（当前自定义数据会丢失）")) {
    userData = JSON.parse(JSON.stringify(mergedData));
    activeIdx = 0;
    saveData();
    renderUI();
  }
};

function saveData(sync = true) {
  chrome.storage.local.set({ userData, activeTemplateIndex: activeIdx });
}
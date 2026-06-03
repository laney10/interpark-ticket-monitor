# Interpark 排队监控 — 使用指南

## 功能简介

监控 Interpark 购票排队页面，当排队序号降至预设阈值时，自动发送桌面通知提醒你。

| 特性 | 说明 |
|------|------|
| 监控目标 | 排队序号 "My waiting order" |
| 通知阈值 | ≤ 1000、≤ 500、≤ 100 |
| 通知次数 | 每个阈值仅通知一次（可重置） |
| 后台保活 | 防标签页被 Chrome 挂起/回收 |

## 安装

1. 打开 Chrome，地址栏输入 `chrome://extensions` 并回车
2. 打开右上角 **"开发者模式"** 开关
3. 点击左上角 **"加载已解压的扩展程序"**
4. 选择 `ticket-monitor` 文件夹
5. 安装完成，工具栏会出现扩展图标

> **注意**：安装或更新扩展后，需要**关闭并重新打开**排队页面才能生效。

## 使用方式

### 开始监控

1. 正常进入 Interpark 排队页面（URL 类似 `https://tickets.interpark.com/waiting?key=...`）
2. 扩展会自动开始监控，无需任何操作
3. 排队序号变化时自动检测，到达阈值时弹出桌面通知

### 查看状态

点击浏览器工具栏的扩展图标，弹窗中会显示：

- **当前排队序号** — 大号数字实时显示
- **阈值状态** — 三个阈值各自显示"等待中"或"已通知 ✓"
- **重置通知** — 点击按钮可将所有阈值恢复为"等待中"状态，用于新一轮排队

### 收到通知

当排队序号降到阈值以下时，桌面右下角弹出系统通知：

> **排队进度提醒**
> 当前排队序号已降至 987（阈值 1000），距离购票更近了！

## 工作流程

```
排队页面 (content.js)
  ├── MutationObserver → 监测 DOM 实时变化
  ├── 20 秒定时轮询 → 兜底保障
  └── 静默音频播放 → 防止标签被挂起
        │
        ▼  chrome.runtime.sendMessage
        │
Service Worker (background.js)
  ├── 接收序号更新
  ├── 判断是否触发阈值
  ├── 发送桌面通知
  └── chrome.alarms 每 20s 主动查询 → 双向保活
```

## 测试方法

在排队页面的 DevTools Console（F12）中运行以下命令模拟：

```js
// 模拟序号降至 999（触发 ≤1000 通知）
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '999';

// 模拟序号降至 499（触发 ≤500 通知）
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '499';

// 模拟序号降至 99（触发 ≤100 通知）
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '99';
```

测试后点击扩展弹窗中的"重置通知"按钮即可恢复。

## 故障排查

| 现象 | 解决方法 |
|------|----------|
| 扩展不工作、控制台无日志 | 刷新扩展 ⟳ 后，**关闭并重新打开**排队页面 |
| 通知不弹出 | 检查系统通知设置，确保 Chrome 通知未被屏蔽 |
| 标签页仍被挂起 | 确保在排队页面上有过一次点击/键盘操作（激活音频保活） |
| Popup 显示 "--" | 排队页面可能未打开，或页面不在前台 |

### 查看后台日志

1. **页面日志**：排队页面 → F12 → Console → 过滤 `[TicketMonitor]`
2. **后台日志**：`chrome://extensions` → 点击扩展卡片上的 "Service Worker" 链接

## 文件结构

```
ticket-monitor/
├── manifest.json      # Chrome 扩展配置 (MV3)
├── content.js         # 注入排队页面，DOM 监听 + 数据提取
├── background.js      # Service Worker，通知逻辑 + 状态管理
├── popup.html         # 弹窗界面
├── popup.js           # 弹窗逻辑
├── icon16.png         # 扩展图标 16x16
├── icon48.png         # 扩展图标 48x48
└── icon128.png        # 扩展图标 128x128
```

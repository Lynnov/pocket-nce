# 口袋新概念首版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 交付能本地预览的前三课 H5 样本，支持理解、真实音频播放、提示背诵、复习、离线与备份。

**Architecture:** 使用无构建的静态 ES Modules，界面、播放器、复习规则和浏览器存储分离。原文与讲解由本地教材校对，音频来自用户文件；不调用线上 AI 服务。先本地验证，不在本轮公开部署教材。

**Tech Stack:** HTML、CSS、JavaScript、IndexedDB、Cache API、Service Worker、Node.js 内置测试与本地预览服务器。

## 文件职责

- `app/index.html`：应用入口、可访问对话框和音频元素。
- `app/styles.css`：手机优先的排版、安全区、暗色和桌面预览布局。
- `app/main.js`：页面和学习流程、单词面板、缓存和备份入口。
- `app/core.js`：进度数据、日期调度、提示判定和备份校验，纯函数。
- `app/storage.js`：IndexedDB 的串行读写及失败处理。
- `app/player.js`：单句、整篇、循环和跟读停顿，统一取消机制。
- `app/offline.js`、`app/sw.js`：完整课程缓存、离线资源和音频 Range 请求。
- `app/data/lessons.js`：前三课校对内容与实际录音时间轴。
- `app/audio/`：本地 MP3，不提交 Git。
- `scripts/serve.mjs`：只暴露 app 目录的预览服务器，支持 MP3 字节范围。
- `tests/core.test.mjs`、`tests/player.test.mjs`：保护进度和播放器边界行为。
- `README.md`：启动、材料复制和真机验收说明。

## Task 1 素材与数据约定

- [x] 核对 PDF 第 15、19、23 页，整理英文、参考译意、语境词义和关键词提示。
- [x] 将前三课 MP3 复制到 `app/audio/lesson-1.mp3` 至 `lesson-3.mp3`。
- [x] 按现有录音确定正文和句子起止；没有完成对齐的课标为 unverified，不提供虚假的逐句能力。
- [x] 用数据检查保证句号标识唯一、时间单调且不超音频长度、词条例句引用存在。

句子结构固定为 `{ id, text, translation, cue, paragraph, start, end, note }`，课文结构固定为 `{ id, title, chineseTitle, summary, sourcePage, printedPage, audio, duration, audioStart, audioEnd, alignmentStatus, sentences, vocabulary }`。

## Task 2 状态与安全备份

- [x] 先写 `node --test tests/core.test.mjs` 用例，验证首次成功隔天复习、连续成功递增、失败重置、提示后不记独立背出和损坏备份拒绝。
- [x] 运行并确认失败原因是能力未实现。
- [x] 实现 `initialState()`、`localDay(date)`、`scheduleReview(previous, result, date)`、`finishSession(state, result, date)`、`parseBackup(text)`。
- [x] IndexedDB 用单记录存储版本化状态；写入串行，失败由界面显示并允许导出内存进度。
- [x] 再运行测试，确认通过。

首轮规则使用 `intervals = [1, 3, 7, 14]`，成功取当前连续成功次数对应间隔，失败或需提示重置；日期使用当地日历运算，不用毫秒数替代自然日。

## Task 3 页面与学习流程

- [x] 创建静态入口、今日页、课文列表、生词复习面板和设置面板。
- [x] 学习页接入理解、练句、提示背诵、串背阶段；阶段切换取消播放器任务。
- [x] 原文按段落显示，点击单词打开释义，句侧按钮播放；提示内容和原文答案揭示可追踪。
- [x] 保存句子、阶段、提示级别、音频位置和滚动位置。恢复后保持暂停。
- [x] 自评保存后展示下一次复习日期；没有完成的学习保持进行中。
- [x] 字号、暗色、语速、单词熟悉度及备份恢复入口完成闭环。

视觉方向：暖白纸张色、深青绿色主操作、衬线英文标题、清晰的中文界面。正文优先，低干扰装饰；小屏控件不挤占阅读区。

## Task 4 播放和离线

- [x] 为切句取消循环、手动暂停取消跟读计时和拒绝未对齐单句播放写失败测试。
- [x] 播放器只使用一个 audio 元素；结束边界暂停，跟读计时按句长除以语速，切换和退出统一取消计时。
- [x] 整篇播放跳过片头；页面隐藏停止自动跟读调度，恢复后由用户操作。
- [x] 缓存页面和课程必需资源；仅所有资源成功后显示可离线。
- [x] 离线音频使用缓存完整文件响应字节范围请求，满足 Safari 媒体加载要求。
- [x] 下载失败保留失败状态；清理音频缓存不影响学习数据库。

## Task 5 验证与交付

- [x] 运行 `node --test tests/*.test.mjs`，检查实际失败并修复。
- [x] 运行 `node scripts/serve.mjs`，验证 HTML、JS、音频与 Range 请求。
- [x] 打开本地预览，检查首屏、课程进入、点词、提示、背诵、自评、刷新恢复和备份流程。
- [x] 浏览器检查与 iPhone 真机检查分开记录，不能把桌面预览称为真机通过。
- [x] 进行规格审查，再进行代码质量审查，修复重要问题。
- [x] 保存验证记录，提交代码并将完成结果整合回用户工作目录。

首版验收以可操作、可恢复和内容准确为准。HTTPS 个人访问地址、iPhone 来电及锁屏行为留作真机部署阶段验证，不把本地 localhost 链接当作手机可访问链接。

本地样本已交付。iPhone 真机、HTTPS 个人访问和人工逐句听审仍按验证记录保留为后续验收项。

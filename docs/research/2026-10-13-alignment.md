# 前三课音频逐句对齐记录

日期：2026-10-13。范围：用户提供的《新概念英语》第二册前 3 课、美音 MP3，本地个人学习 H5。

## 结论

45 个句段全部通过本地识别文本匹配和切片复验。`alignmentStatus: verified` 表示已做这些机器检查与停顿边界复核，并不表示人工听审或音素级强制对齐。时间来自真实录音中的语音与停顿，未使用字数比例估算。

| 课文 | PDF 页 / 印刷页 | 句段数 | MP3 时长 | 正文播放范围 |
| --- | --- | ---: | ---: | --- |
| 1. A private conversation | 15 / 12 | 16 | 78.579313 s | 15.88–71.85 s |
| 2. Breakfast or lunch? | 19 / 16 | 18 | 81.374188 s | 15.98–74.85 s |
| 3. Please send me a card | 23 / 20 | 11 | 76.202125 s | 16.16–69.89 s |

## 原文与内容

直接查看所给 PDF 对应页面的渲染图，逐句录入课文；保留 theatre、thirty-seven 等原拼写和书中引号、标点。每句配中文译文、英文提示词与适用的语法或短语说明。共收录 28 个课本生词及 15 个补充短语。中文句译按句段整理，简介与学习说明为本次编写。含引述语的一句（如 “I can’t hear a word!” I said angrily.）保留为一个学习句段。

源 PDF SHA-256：`30f1219bd738cfbfea00e8bc8e1b51f752a3eb1d47c87090f0120ded0a203633`。源页为 1-based PDF 页码。

## 对齐与复验方法

1. 使用 FFprobe 读取实际文件时长。MP3 原样复制到 app/audio，未重编码。
2. 在本机安装 faster-whisper 1.2.1，下载 Systran/faster-whisper-base.en 到用户缓存目录；CPU int8、beam_size=5、language=en、word_timestamps=True、vad_filter=False。没有将音频上传外部服务。
3. PyAV 19.0.1 与 faster-whisper 的 metadata_errors 参数不兼容。改用本机 FFmpeg 解码为 16 kHz 单声道 float32，直接把数组交给模型，避免修改系统库。
4. 对全部正文逐词匹配。忽略大小写及标点，规范化 theater/theatre、ant/aunt、37/thirty-seven，以及引号和连字符分词。标题、听前说明、问题和结尾音效不计入正文。
5. 使用 FFmpeg silencedetect=noise=-35dB:d=0.20 取得停顿区间，逐项将每个句段的语义首尾与停顿对应；句首提前 0.12 秒、句尾保留 0.12 秒，保护弱音与句尾辅音。保留引述语内部、逗号内部的停顿。
6. 依据最终 start/end 从原解码数组独立切出 45 个音频片段，再逐片进行一次未提供提示文本的本地语音识别。45/45 与对应课本句段在上述规范化后完全匹配。
7. 验证所有时间为有限数、0 ≤ start < end ≤ duration，句段依次递增且不重叠；全部词汇示例引用与提示词完整。

## 限制与复核依据

ASR 本身不能证明每个音素的边界精确无误；本次没有人工听审。120 ms 的保护边界、波形停顿复核与逐片全文匹配可降低裁断首尾的风险。若替换为其他版本录音，必须重新对齐，不能沿用这些时间。

完整文件哈希、逐句时间、切片识别结果、原始词级估计与模型版本见 `2026-10-13-alignment-evidence.json`。原始全轨 ASR、FFmpeg 静音检测日志和本次临时脚本位于未纳入版本控制的 `tmp/alignment/`。本地模型缓存：`C:/Users/DJ/.cache/pocket-nce-models/`。

## 最终句段时间

| ID | 起始（秒） | 结束（秒） | 原文 |
| --- | ---: | ---: | --- |
| 1-1 | 15.88 | 18.82 | Last week I went to the theatre. |
| 1-2 | 19.37 | 21.53 | I had a very good seat. |
| 1-3 | 22.04 | 24.37 | The play was very interesting. |
| 1-4 | 25.04 | 26.81 | I did not enjoy it. |
| 1-5 | 27.42 | 31.36 | A young man and a young woman were sitting behind me. |
| 1-6 | 31.95 | 34.01 | They were talking loudly. |
| 1-7 | 34.57 | 36.73 | I got very angry. |
| 1-8 | 37.39 | 39.99 | I could not hear the actors. |
| 1-9 | 40.60 | 42.02 | I turned round. |
| 1-10 | 42.78 | 46.24 | I looked at the man and the woman angrily. |
| 1-11 | 47.21 | 49.84 | They did not pay any attention. |
| 1-12 | 50.65 | 54.27 | In the end, I could not bear it. |
| 1-13 | 54.95 | 56.72 | I turned round again. |
| 1-14 | 57.43 | 62.64 | ‘I can’t hear a word!’ I said angrily. |
| 1-15 | 63.42 | 68.42 | ‘It’s none of your business,’ the young man said rudely. |
| 1-16 | 68.96 | 71.85 | ‘This is a private conversation!’ |
| 2-1 | 15.98 | 17.27 | It was Sunday. |
| 2-2 | 17.96 | 21.29 | I never get up early on Sundays. |
| 2-3 | 22.02 | 25.83 | I sometimes stay in bed until lunchtime. |
| 2-4 | 26.80 | 30.14 | Last Sunday I got up very late. |
| 2-5 | 31.04 | 32.98 | I looked out of the window. |
| 2-6 | 33.43 | 35.20 | It was dark outside. |
| 2-7 | 35.82 | 38.99 | ‘What a day!’ I thought. |
| 2-8 | 39.59 | 41.55 | ‘It’s raining again.’ |
| 2-9 | 42.58 | 45.34 | Just then, the telephone rang. |
| 2-10 | 46.02 | 47.88 | It was my aunt Lucy. |
| 2-11 | 49.00 | 52.55 | ‘I’ve just arrived by train,’ she said. |
| 2-12 | 53.07 | 54.96 | ‘I’m coming to see you.’ |
| 2-13 | 55.99 | 59.74 | ‘But I’m still having breakfast,’ I said. |
| 2-14 | 60.53 | 63.24 | ‘What are you doing?’ she asked. |
| 2-15 | 63.80 | 66.85 | ‘I’m having breakfast,’ I repeated. |
| 2-16 | 67.38 | 69.82 | ‘Dear me,’ she said. |
| 2-17 | 70.37 | 72.85 | ‘Do you always get up so late? |
| 2-18 | 73.36 | 74.85 | It’s one o’clock!’ |
| 3-1 | 16.16 | 19.95 | Postcards always spoil my holidays. |
| 3-2 | 20.98 | 23.67 | Last summer, I went to Italy. |
| 3-3 | 24.24 | 28.31 | I visited museums and sat in public gardens. |
| 3-4 | 28.92 | 32.69 | A friendly waiter taught me a few words of Italian. |
| 3-5 | 33.41 | 35.22 | Then he lent me a book. |
| 3-6 | 36.10 | 40.74 | I read a few lines, but I did not understand a word. |
| 3-7 | 41.77 | 45.42 | Every day I thought about postcards. |
| 3-8 | 46.06 | 51.95 | My holidays passed quickly, but I did not send cards to my friends. |
| 3-9 | 52.96 | 56.76 | On the last day I made a big decision. |
| 3-10 | 57.46 | 62.18 | I got up early and bought thirty-seven cards. |
| 3-11 | 63.06 | 69.89 | I spent the whole day in my room, but I did not write a single card! |

## 内容版本与整轨区间补充

内容版本标识：`nce2-l01-l03-en-us-2026-10-13-v1`。模块新增命名导出 `contentVersion`，每课含同值 `contentVersion`；原有 `lessons` 导出及其所有字段、正文句段时间保持不变。新增 `audioSections` 对象：`title`、`instruction`、`question`、`body`。每个区间含 `label`、`text`、`start`、`end`、`alignmentStatus`、`verificationMethod` 和 `humanListening`。这是向后兼容的元数据扩展。

`title` 包含录音中的 Lesson 编号及标题；课前说明与提问分开。所有区间均定位到原始 MP3；静音间隙与结尾音效不伪装成正文。本轮又独立截取 9 个前导区间，在没有课文提示的情况下运行本地 ASR；9/9 经忽略大小写、标点、所有格写法以及 ant/aunt 后匹配预期内容。Lesson 2 的 writers ant 是 ASR 对 writer’s aunt 的同音识别误差，源书文字保持 writer’s aunt。

| 课次 | 区间 | 起始秒 | 结束秒 | 实际切片识别输出 |
| --- | --- | ---: | ---: | --- |
| 1 | 标题 | 0.50 | 4.01 | Lesson 1. A private conversation. |
| 1 | 课前说明 | 5.07 | 8.79 | First, listen and then answer the question. |
| 1 | 课前提问 | 9.74 | 14.03 | Why did the writer complain to the people behind him? |
| 1 | 正文 | 15.88 | 71.85 | 见上述 16 个句段复验 |
| 2 | 标题 | 0.52 | 4.67 | Lesson 2. Breakfast or lunch |
| 2 | 课前说明 | 5.59 | 9.34 | First, listen, and then answer the question. |
| 2 | 课前提问 | 10.44 | 14.13 | Why was the writers ant surprised? |
| 2 | 正文 | 15.98 | 74.85 | 见上述 18 个句段复验 |
| 3 | 标题 | 0.46 | 4.99 | Lesson 3. Please send me a card. |
| 3 | 课前说明 | 6.17 | 9.87 | First, listen and then answer the question. |
| 3 | 课前提问 | 11.03 | 14.26 | How many cards did the writer send? |
| 3 | 正文 | 16.16 | 69.89 | 见上述 11 个句段复验 |

这些前导区间同样根据既有全轨 ASR 的语义顺序和 FFmpeg 检出的实际静音首尾选取，首尾各保留 0.12 秒。切片复验使用 faster-whisper 1.2.1、base.en、CPU int8、beam_size=5、language=en、vad_filter=False。

听审能力说明：当前工具可以驱动播放器、读取播放时间或进行本地解码/识别，但没有能让我实际听见并审听声音的能力。本次没有人工听审或实际听感判断。所有新增区间均写明 `verificationMethod: local-asr-and-waveform`、`humanListening: false`；`verified` 仅指上述机器校验与静音边界复核。

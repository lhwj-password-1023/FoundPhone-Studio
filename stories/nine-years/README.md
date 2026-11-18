# 九年时差

默认作品从 2026 年 11 月 20 日 21:33（首尔）开始。玩家在金昇玟的手机上接到一条来自陌生号码的短信。对方手机上的日期是 2017 年 11 月 20 日。作品为虚构同人故事。

第一场的全部台词、停顿、可选回复与备忘录正文保存在 `story.json`。读完告别消息后，打开备忘录里的《十一月二十日晚》，写下文字并点「完成」。返回信息，亲手发出最后两句，陌生号码稍后发来报纸照片，进入第二场。

第二场两种回复各自收到回应后汇合。玩家先在日历查看 2026-10-04 的「送别」，再点开图库最下方 2024-10-23 的牵手照，方可发出「那你可以教教我，怎么忘记一个人吗」。后续从 `sceneTwoComplete` 继续。报纸和牵手照均为 AI 生成的虚构剧情素材。版本 4 可接续版本 3 的第一场存档。

`demo.json` 保留此前的六月演示稿与回归用例。演示中的车窗照片为 OpenAI ImageGen 生成的原创场景图。原项目、依赖、第三方界面与图标的许可说明随仓库保留。


## 社交行为与权限

X 预设独立维护在 story.extras.json，构建、校验和剧情路径测试自动合并这个同名附加文件。附加文件只支持追加应用、变量和内容，故事主线仍在 story.json。照片通过 meta.resource 引用现有相册，编译时解析素材。

X 使用 twitter App ID。用户、动态、通知、私信、趋势按 content.twitter 的 folder 区分。所有账号均为故事内虚构账号，用户名以 mock_ 开头。普通互动不连到主线事件。

发送内容由已有 choice 节点授权。预设记录的 meta.reply 指向该节点，meta.action 指定 message、reply、post、comment、repost、dm 或 email，meta.actionTarget 指定会话标题或动态 ID。未填写 action 的信息和聊天记录兼容原有 message 回复。可选 meta.permission 引用布尔剧情变量进一步限制该预设。每次发送开始和确认时均重新检查当前 choices，禁止用自由草稿创建正式记录。

回电沿用 requestCallback 事件，需同时配置 permit:call:应用ID:联系人卡片ID 为 true，且该事件尚未完成。点赞、收藏、浏览、搜索独立于发送权限。X 的 like、unlike、save、unsave、viewProfile、viewComments、readComment、search 只通知已有事件系统，剧情作者需明确配置事件才能产生剧情效果。

私信使用 read 记录和原有状态系统。X 的通知和未读私信共同计入桌面角标。所有内容先由剧情可见性过滤，再按手机年表时间过滤。历史搜索可找到 historyOnly 的普通旧动态。

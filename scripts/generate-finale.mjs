import { writeFile } from 'node:fs/promises';

// Source for the continuation overlay. Every dialogue beat is a separate record
// and a separate player send or read event.
const out = { revision: 7, installedApps: ['news'], variables: { finalPhase: 0, finalBranch: '', storyConnection: '2017', storyTransferAmount: '', storyFinalComplete: false }, content: { messages: [], kakao: [], calendar: [], safari: [], notes: [], news: [], weather: [] }, events: [], tests: [] };
const C = (key, value = true, op = 'eq') => ({ key, op, value });
const A = (type, key, value = '') => ({ type, key, value });
const N = (id, event, target, actions = [], next = [], conditions = [], type = 'action') => out.events.push({ id, label: id, type, event, target, actions, next, conditions });
let serial = 0, previous = '', stampDate = '2026-11-21';
function link(id) { if (previous) out.events.find(n => n.id === previous).next.push(id); previous = id; }
function entry(id, condition, actions = []) { N(id, 'read', 's4-recontact-d', actions, [], condition); previous = id; }
function dialogue(app, who, body, id) {
  id ||= `f-msg-${++serial}`;
  const mine = who === '金昇玟';
  const title = app === 'kakao' ? (who === '金昇玟' ? currentKakao : who) : '陌生号码';
  const item = { id, title, body, sender: who, time: `${stampDate} ${stampDate === '2030-10-09' ? '10:00' : '00:52'}`, hidden: true, outgoing: mine, meta: {} };
  if (mine) item.meta.reply = `f-send-${id}`;
  out.content[app].push(item);
  if (mine) {
    const offer = `f-offer-${id}`;
    N(offer, '', '', [], [`f-send-${id}`], [], 'choice'); link(offer);
    N(`f-send-${id}`, '', '', [A('unlock',id)], []); previous = `f-send-${id}`;
  } else {
    const deliver = `f-deliver-${id}`;
    N(deliver, '', '', [A('unlock',id), A('notification',id)], []); link(deliver);
    N(`f-read-${id}`, 'read', id, [], []); previous = `f-read-${id}`;
  }
  return id;
}
let currentKakao = '方灿';
function gate(id, event, target, phase, actions = []) {
  N(id, event, target, [A('variable','finalPhase',phase), ...actions], [], [C('finalPhase',phase-1)]);
  previous = id;
}
function checkpoint(id, phase, event, target, actions = []) {
  const node = out.events.find(n => n.id === previous);
  node.actions.push(A('variable','finalPhase',phase), ...actions);
  previous = '';
  gate(id,event,target,phase+1);
}
function lines(app, rows) { for (const [who,body,id] of rows) dialogue(app,who,body,id); }

entry('f-start',[C('sceneFourStage16'),C('finalPhase',0)],[A('variable','finalPhase',1)]);
lines('messages',[
  ['金昇玟','你终于肯信我了。'],
  ['金昇玟','至于我是谁……你还是别知道比较好，就当我是个能看见未来的树洞吧。'],
  ['旻浩哥','行吧，看在你连那件事都能算准的份上。','f-news-reference'],
  ['旻浩哥','所以你之前死活不让我去JYP，是因为我进了这一行会出事？'],
  ['金昇玟','是。只要你别进那个圈子，别去当爱豆，去过普通人的生活，2026年的意外就不会发生。'],
  ['旻浩哥','可我今天又遇到灿哥了。'],
  ['旻浩哥','而且……我真的很喜欢跳舞。'],
  ['旻浩哥','不去试试的话，我这辈子都会不甘心的。'],
]);
// Branches converge on an explicit branch completion event.
const branchOffer='f-branch-offer'; N(branchOffer,'','',[],['f-branch-a1','f-branch-b1'],[],'choice');link(branchOffer);
for (const [branch, first, second, answer] of [
  ['A','到底什么比活着还重要？','你能不能听话一次？','管得比我妈还宽。'],
  ['B','算我求你了，哪怕为了身边爱你的人，换条路走吧。',null,'可我身边现在也没什么非我不可的人啊……倒是你，干嘛这么在乎我的死活？']
]) {
  const id1=`f-branch-${branch.toLowerCase()}1`;
  out.content.messages.push({id:`f-branch-${branch}-one`,title:'陌生号码',body:first,sender:'金昇玟',time:'2026-11-21 02:00',hidden:true,outgoing:true,meta:{reply:id1}});
  N(id1,'','',[A('unlock',`f-branch-${branch}-one`),A('variable','finalBranch',branch)],[]);
  out.events.at(-1).label=first;
  if(second){
    const item=`f-branch-${branch}-two`, offer=`f-branch-${branch}-offer-two`, send=`f-branch-${branch}-send-two`;
    out.content.messages.push({id:item,title:'陌生号码',body:second,sender:'金昇玟',time:'2026-11-21 02:01',hidden:true,outgoing:true,meta:{reply:send}});
    N(offer,'','',[],[send],[],'choice');out.events.find(n=>n.id===id1).next.push(offer);
    N(send,'','',[A('unlock',item)],['f-branch-'+branch+'-reply']);
  } else out.events.find(n=>n.id===id1).next.push('f-branch-'+branch+'-reply');
  const replyId=`f-branch-${branch}-answer`;
  out.content.messages.push({id:replyId,title:'陌生号码',body:answer,sender:'旻浩哥',time:'2026-11-21 02:02',hidden:true,meta:{}});
  N('f-branch-'+branch+'-reply','','',[A('unlock',replyId),A('notification',replyId)],[]);
  N('f-branch-'+branch+'-read','read',replyId,[A('variable','finalPhase',2)],[]);
}
previous='';gate('f-week-1','storyTimeAdvance','week-1',3);
lines('messages',[
  ['旻浩哥','今天练舞把膝盖弄疼了。'],['金昇玟','左边膝盖？'],['旻浩哥','？？？'],['旻浩哥','你怎么知道？'],['金昇玟','当然。'],['金昇玟','先休息，别硬撑。'],['金昇玟','以后不舒服的话，记得及时去检查。'],['旻浩哥','未来的人连这个都知道？'],['旻浩哥','有点可怕啊你。'],['金昇玟','未来的人还知道，你从来没听过我的建议。'],['旻浩哥','合理，是我的风格。'],
]);
checkpoint('f-clue-1',4,'read','f-clue-chat-1',[A('unlock','f-clue-chat-1'),A('notification','f-clue-chat-1')]);
currentKakao='方灿'; out.content.kakao.push({id:'f-clue-chat-1',title:'方灿',sender:'方灿',body:'旻浩以前工作再累，也总说休息一下就好。现在想起来，他把很多压力都藏着。',time:'2026-11-21 03:00',hidden:true});
previous='f-clue-1';
N('f-offer-week-2','', '',[],[],[]);link('f-offer-week-2');
checkpoint('f-week-2',6,'storyTimeAdvance','week-2');
lines('messages',[
  ['旻浩哥','刚练完，好饿。'],['金昇玟','去便利店第二排买个焦糖布丁。'],['旻浩哥','这么精确'],['金昇玟','你肯定喜欢。'],['旻浩哥','但我还没吃过呢。'],['旻浩哥','买了。'],['旻浩哥','确实挺好吃。'],['旻浩哥','以后要是见面，你得请我吃十个。'],['金昇玟','十个不会腻吗。'],['旻浩哥','那分你一个吧'],['金昇玟','……'],
]);
checkpoint('f-clue-2',8,'read','f-clue-calendar',[A('unlock','f-clue-calendar')]);
out.content.calendar.push({id:'f-clue-calendar',title:'取消的周末约会',body:'李旻浩 · 原本约好一起吃饭。备注：最近的压力和睡眠情况，下次就诊时记得告诉医生。',time:'2026-09-12 15:00',hidden:true});
previous='f-clue-2';checkpoint('f-week-3',9,'storyTimeAdvance','week-3');
lines('messages',[
  ['旻浩哥','今天怎么一直没消息？'],['金昇玟','有工作。'],['旻浩哥','哦。'],['旻浩哥','我还以为你失踪了。'],['金昇玟','你很想我？'],['旻浩哥','少自恋。'],['旻浩哥','不过下次忙的话提前说一声。'],['金昇玟','好。'],
]);
checkpoint('f-clue-3',11,'read','f-clue-chat-2',[A('unlock','f-clue-chat-2'),A('notification','f-clue-chat-2')]);
out.content.kakao.push({id:'f-clue-chat-2',title:'李龙馥',sender:'李龙馥',body:'昇玟，我们知道你一直在想旻浩哥。那时候谁都没看清他承受了多少，不要把全部责任揽在自己身上。',time:'2026-11-21 04:00',hidden:true});
previous='f-clue-3';checkpoint('f-week-4',12,'storyTimeAdvance','week-4');
lines('messages',[
  ['旻浩哥','所以我们真的不能见面吗？'],['金昇玟','现在不行。'],['旻浩哥','那以后呢？'],['金昇玟','也许吧。'],['旻浩哥','你每次都这么说。'],['旻浩哥','2026年很远吗？'],['金昇玟','很远。'],['旻浩哥','那我慢慢走过去不就好了。'],
]);
checkpoint('f-clue-4',14,'read','f-clue-news',[A('unlock','f-clue-news')]);
out.content.safari.push({id:'f-clue-news',title:'关于李旻浩的公开报道（架空同人剧情）',body:'这是一篇故事内虚构报道：李旻浩于2026年自杀离世。亲友回忆他长期承受复杂的工作与心理压力，无法把这一结果归因于某个单一决定。报道不涉及方法与过程。',time:'2026-10-20 10:00',hidden:true,meta:{source:'故事内虚构新闻'}});
previous='f-clue-4';checkpoint('f-week-5',15,'storyTimeAdvance','week-5');
lines('messages',[
  ['旻浩哥','今天又下雨了，练习室的窗户一直响。'],['金昇玟','记得带伞。'],['旻浩哥','已经带了，你的提醒晚了一步。'],['旻浩哥','还有，我提交选秀报名表了。'],
  ['金昇玟','为什么？！我明明把所有的捷径和退路都告诉你了，为什么你还是要去参加选拔？！'],['金昇玟','为什么你就这么执着？！'],
  ['旻浩哥','……你别哭啊。隔着屏幕我都好像听见你哭了，康阿叽。'],['旻浩哥','其实一直没跟你说。在我更小的时候，家里特别困难，有阵子我连舞室的练习费都交不起，快要坚持不下去了。'],['旻浩哥','就在我打算彻底放弃跳舞的那天，有个陌生人给我转了一笔钱，还一直发消息给我打气，帮我守住了跳舞的梦想。'],['旻浩哥','从那时候起，我的人生才有了希望和方向。我不想让那个人失望，也不想让自己失望。'],
  ['金昇玟','……原来你心里一直有这么一个人。'],['金昇玟','好吧，我一个后来才出现的人，确实比不了。'],['旻浩哥','……噗，你这是在吃醋吗？'],['旻浩哥','以前确实是因为他。但现在，我多了一个非去不可的理由。'],['金昇玟','什么理由？'],['旻浩哥','我想站到最亮的地方，然后一直走到2026年，去见你。'],['金昇玟','……你疯了吗！'],['金昇玟','我都说了，那样你会死'],['旻浩哥','无所谓，我是活在当下的人。'],['旻浩哥','如果活到一百岁的代价是永远见不到你，那我宁愿选现在。'],
]);
// Countdown is an overlay. It waits for each manual send and pauses during typing.
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',17));
lines('messages',[
  ['旻浩哥','等等，我手机上突然提示对话即将关闭？！'],['旻浩哥','喂！你还没告诉我你到底是谁！2026年我要去哪里找你？！'],['金昇玟','李旻浩，不后悔的话，就来找我吧。'],['金昇玟','我叫金昇玟，是你未来的队友，也是未来最喜欢你的那个人。'],
]);
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',18),A('variable','storyConnection','interrupted'),A('notification','', '时光机器已达上限，对话已永久关闭。'));
previous='';
// The anomaly changes the communication anchor. It does not move the 2026 phone clock.
N('f-reconnect','storyReconnect','2010',[A('variable','finalPhase',19),A('variable','storyConnection','2010'),A('notification','', '系统提示：iMessage 时空对话已修复。')],[],[C('finalPhase',18)]);
previous='f-reconnect';
lines('messages',[
  ['金昇玟','旻浩哥！你还在吗？！'],['旻浩哥','……你是谁？怎么知道我的名字？'],['旻浩哥','如果是舞室老师让你来催学费的，不用催了，我明天就退课，以后再也不跳了。'],['金昇玟','……退课？'],['金昇玟','今年是哪一年？'],['旻浩哥','2010年啊，莫名其妙。'],['金昇玟','别退课'],['金昇玟','不要放弃跳舞'],['旻浩哥','说得轻巧，连下个月舞室押金都交不起的人，谈什么梦想。'],
]);
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',20));
previous='';gate('f-transfer','storyTransfer','2010',21);
lines('messages',[
  ['旻浩哥','？！你给我转钱干什么？你到底是谁？'],['金昇玟','一个在未来看过你跳舞的人。'],['金昇玟','你在舞台上真的很耀眼，所以拜托你，一定要坚持下去。'],['金昇玟','哪怕前面再难，也别放弃，总有一天你会遇到一群很爱你的队友。'],['旻浩哥','……谢谢你。这笔钱我记下了，以后一定还给你。'],['旻浩哥','我不会放弃的'],
]);
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',22),A('variable','storyConnection','interrupted'),A('notification','', '因果闭环已完成，iMessage 对话再次永久关闭。'));
previous='';gate('f-note-unlock','password','f-locked-note',23);
out.content.notes.push({id:'f-locked-note',title:'给昇玟',body:'昇玟啊，当你解开这个密码的时候，应该已经给小时候那个穷得叮当响的我转完账了吧？\n\n其实在 JYP 练习生室第一次见到你，听见你自我介绍说“你好，我叫金昇玟”的那一秒，我就知道你是谁了。\n\n只是那时候的你，还是一张白纸，还不知道后来会发生时光机器的事。所以我假装什么都不知道，把秘密藏在心里，顺理成章地成为你的哥哥、你的队友，你的爱人。\n\n金昇玟，我来找你了，我一点都不后悔。和你在一起的每一天，我都非常非常幸福。\n\n所以，别再试图回到过去救我了，好好吃饭，好好生活下去。\n\n我始终相信，既然奇迹能在我们身上发生第一次，以后就肯定还会发生第二次。\n\n——你旻浩哥',sender:'李旻浩',time:'2026-09-22 20:10',password:'dynamic',meta:{hint:'我们故事真正开始的数字（4位）',dynamicPassword:'storyTransferAmount',createdAt:'2026-09-22 20:10'}});
N('f-note-read','read','f-locked-note',[A('variable','finalPhase',24)],[],[C('finalPhase',23)]);
previous='';gate('f-years','storyTimeAdvance','future-autumn',25);
currentKakao='李龙馥';previous='f-years';stampDate='2030-10-09';
lines('kakao', [['李龙馥','昇玟，最近休假天气这么好，周末要不要一起出去露营？'],['金昇玟','好啊，一起去吧。']]);
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',26));
previous='';gate('f-camp','storyTimeAdvance','camp-day',27);
// Notifications are unlocked in order by a short, deterministic timer chain.
for(const [id,app,title,body] of [
  ['f-alert-weather','weather','天气警报','暴雨及泥石流红色预警：山区突发强降雨，局部地区已出现山体滑坡与泥石流迹象，请立即中止户外活动并紧急避险！'],
  ['f-alert-mom','kakao','妈妈','昇玟！看到新闻说你们露营的山区发泥石流了！你在哪？快回电话啊！！'],
  ['f-alert-chan','kakao','方灿','昇玟！能看到消息吗？！你在山里是不是安全？搜救队已经过去了，千万撑住！'],
  ['f-alert-han','kakao','韩知城','昇玟呐别吓我，快回个消息啊！！电话怎么不在服务区！！'],
  ['f-alert-news','news','突发快讯','受突发特大暴雨影响，山区露营地发生严重泥石流灾害，现场有两人失联，搜救工作正在进行中……']
]){
  out.content[app].push({id,title,body,sender:title,time:'2030-10-12 18:30',hidden:true});
  N('f-deliver-'+id,'','',[A('unlock',id),A('notification',id)],[],[],'delay');out.events.at(-1).delayMs=650;
  link('f-deliver-'+id);
}
out.events.find(n=>n.id===previous).actions.push(A('variable','finalPhase',28));
previous='';gate('f-rescue-time','storyTimeAdvance','rescue-72h',29);
out.events.at(-1).conditions.push(...['f-alert-weather','f-alert-mom','f-alert-chan','f-alert-han','f-alert-news'].map(id=>C(`read:${id}`)));
for(const [id,app,title,body] of [
  ['f-rescue-mom','kakao','妈妈','太好了……接到医院电话说你被一位好心人救出来了，醒了就好好休息，妈妈马上赶过去！'],
  ['f-rescue-chan','kakao','方灿','谢天谢地你们被救出来了！医生说没有生命危险，你先安心养伤，别的事都别想！'],
  ['f-rescue-news','news','最新进展','生命的奇迹！山区泥石流失联的两人已全部获救，目前体征平稳。']
]){
  out.content[app].push({id,title,body,sender:title,time:'2030-10-15 18:30',hidden:true});
  N('f-deliver-'+id,'','',[A('unlock',id),A('notification',id)],[],[],'delay');out.events.at(-1).delayMs=650;
  link('f-deliver-'+id);
}
previous='';for(const id of ['f-rescue-mom','f-rescue-chan','f-rescue-news']) N('f-rescue-read-'+id,'read',id,[A('variable','finalPhase',30)],[],[C('finalPhase',29),...['f-rescue-mom','f-rescue-chan','f-rescue-news'].map(key=>C(`read:${key}`))]);
N('f-final-photo','storyShutter','final',[A('variable','finalPhase',31),A('variable','storyFinalComplete',true)],[],[C('finalPhase',30)]);
N('f-resume','resumeRevision','6',[],['f-start'],[C('sceneFourStage16')]);

await writeFile('stories/nine-years/story.finale.json',JSON.stringify(out,null,2)+'\n');
const hints = {
  0:['messages','打开「信息」→「旻浩哥」，继续阅读新消息。'],
  1:['messages','打开「信息」→「旻浩哥」，逐条发送预设回复并阅读对方消息。'],
  2:['timemachine','打开「时光机器」，将李旻浩的通信时间向前推进一周，然后返回信息。'],
  3:['messages','打开「信息」→「旻浩哥」，完成练舞受伤的对话。'],
  4:['kakao','打开 KakaoTalk →「方灿」，阅读关于旻浩的消息。'],
  6:['timemachine','打开「时光机器」，将李旻浩的通信时间再推进一周，然后返回信息。'],
  7:['messages','打开「信息」→「旻浩哥」，完成便利店布丁的对话。'],
  8:['calendar','打开「日历」，翻到 2026 年 9 月，点开「取消的周末约会」。'],
  9:['timemachine','打开「时光机器」，将李旻浩的通信时间再推进一周，然后返回信息。'],
  10:['messages','打开「信息」→「旻浩哥」，完成彼此习惯联系的对话。'],
  11:['kakao','打开 KakaoTalk →「李龙馥」，阅读关于旻浩的消息。'],
  12:['timemachine','打开「时光机器」，将李旻浩的通信时间再推进一周，然后返回信息。'],
  13:['messages','打开「信息」→「旻浩哥」，完成关于未来相遇的对话。'],
  14:['safari','打开 Safari，阅读故事内关于李旻浩的虚构报道。'],
  15:['timemachine','打开「时光机器」，将李旻浩的通信时间再推进一周，然后返回信息。'],
  16:['messages','打开「信息」→「旻浩哥」，继续关于选秀的对话。'],
  17:['messages','打开「信息」→「旻浩哥」，逐条阅读倒计时消息并亲自发送最后两条话。'],
  18:['timemachine','打开「时光机器」，查看中断的连接和新的时间锚点，再返回信息。'],
  19:['messages','打开「信息」→「旻浩哥」，和 2010 年的少年旻浩交谈。'],
  20:['messages','在「信息」→「旻浩哥」点击「转账/汇款」，用屏幕数字键选任意四位数，确认附言后转账。记住金额。'],
  21:['messages','返回「信息」→「旻浩哥」，读完少年旻浩的回复并发送鼓励的话。'],
  22:['notes','打开「备忘录」→《给昇玟》，点击密码框自动填入刚才的四位金额，再点解锁。'],
  23:['notes','在「备忘录」完整阅读《给昇玟》，滑到结尾并确认。'],
  24:['timemachine','打开「时光机器」，将金昇玟的时间推进至几年后的秋天。日历会同步更新。'],
  25:['kakao','打开 KakaoTalk →「李龙馥」，阅读露营邀请并发送预设回复。'],
  26:['timemachine','打开「时光机器」，将金昇玟的时间推进至露营当天。'],
  27:['weather','先打开「天气」查看红色预警，再到 KakaoTalk 查看妈妈、方灿、韩知城的消息，最后打开「新闻」阅读快讯。'],
  28:['timemachine','打开「时光机器」，将金昇玟的时间向前推进 72 小时。'],
  29:['news','阅读 KakaoTalk 的获救消息，再打开「新闻」阅读最新进展。'],
  30:['camera','返回桌面打开「相机」，切换前置摄像头，亲自按快门。'],
  31:['camera','全剧终。可以自由浏览手机内的历史记录。']
};
const guidance = Object.entries(hints).map(([key,[app,hint]]) => {
  const phase=Number(key);
  return {id:`final-${key}`,chapter:'九年',scene:phase<18?'第四场':phase<22?'第五场':phase<24?'第六场':'终场',name:`阶段 ${key}`,type:'story-action',app,target:'',prerequisites:phase===0?{all:[C('sceneFourStage16'),C('finalPhase',0)]}:C('finalPhase',phase),completion:C('finalPhase',phase,'neq'),priority:30,unlocks:[],hint,blocks:app==='messages'?[]:['陌生号码']};
});
await writeFile('stories/nine-years/story.finale.guidance.json',JSON.stringify(guidance,null,2)+'\n');
console.log(`Generated ${out.content.messages.length} iMessage records, ${out.events.length} event nodes`);

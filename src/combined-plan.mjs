export function combinedPlan(level) {
  const length=Math.min(760+level*30,1500),pad=Math.round(length*.32),dock=Math.round(length*.66),n=Math.min(18,3+Math.floor(level*.7));
  return {length,pad,dock,cross:[dock+5,length+120],objectives:[
    {type:'kill',n,label:'طهر الطريق بالدبابة',startX:30},
    {type:'reach',x:pad-8,label:'اقترب من المهبط وانزل من الدبابة'},
    {type:'transfer',x:pad,to:'heli',label:'انزل من الدبابة واصعد الهليكوبتر'},
    {type:'kill',n:n+2,label:'قدم الإسناد الجوي وطهر الطريق إلى المرسى',startX:pad+25},
    {type:'reach',x:dock-10,label:'اهبط عند المرسى لاستلام السفينة'},
    {type:'transfer',x:dock,to:'boat',label:'انزل من الهليكوبتر واصعد السفينة'},
    {type:'kill',n:n+3,label:'دمر القوات البحرية المعادية بالسفينة',startX:dock+35},
    {type:'reach',x:length,label:'أكمل العملية وارفع العلم عند نهاية الممر البحري'},
  ]};
}

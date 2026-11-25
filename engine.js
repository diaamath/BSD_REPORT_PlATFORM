// ===== engine.js : حسابات التحليل (النجاح، التقديرات، التخصصات، الغياب، المدرسون) =====
const GN=['A+','A','B+','B','C+','C','D+','D','F'];
const SH={'الأحياء الدقيقة':'أحياء دقيقة','الكيمياء':'كيمياء','الفيزياء':'فيزياء','الإحصاء':'إحصاء','الرياضيات':'رياضيات','الرياضيات الإكتوارية والمالية':'إكتوارية','العلوم البيئية':'بيئية'};
const ORD=['أحياء دقيقة','كيمياء','فيزياء','إحصاء','رياضيات','إكتوارية','بيئية','علوم أخرى','هندسة أخرى','مدنية','ميكانيكية','كهربائية','صناعية'];
const num=v=>v==null||v===''?NaN:typeof v==='number'?v:parseFloat(String(v).trim().replace(',','.'));
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const med=a=>{const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
function grade(s,c){if(s<=c.passAbove)return 8;const t=c.cuts.split(',').map(p=>+p*c.max/100);for(let i=0;i<7;i++)if(s>=t[i])return i;return 7}
function by(a,f){const m=new Map();for(const r of a){const k=f(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return m}
function st(rs,T){const n=rs.length,p=rs.filter(r=>r.p).length,s=rs.map(r=>r.s);return{n,p,f:n-p,pr:n?p/n*100:0,mean:n?mean(s)/T*100:0,med:n?med(s)/T*100:0}}
function colKey(sp){if(/الصناعية/.test(sp))return'صناعية';if(/الكهربائية/.test(sp))return'كهربائية';if(/الميكانيكية/.test(sp))return'ميكانيكية';if(/المدنية/.test(sp))return'مدنية';if(/هندسة/.test(sp))return'هندسة أخرى';return SH[sp]||'علوم أخرى'}
function analyze(rows,c){const k=c.cols,T=+c.max,R=[];let fixed=0,bad=0;const ex=c.excl.split(',').map(x=>x.trim()).filter(Boolean);
 for(const r of rows){const raw=r[k.score],s=num(raw);if(isNaN(s)){bad++;continue}if(typeof raw==='string'&&raw.includes(','))fixed++;
  const sp=String(r[k.spec]||'').trim()||'غير محدد';
  R.push({sex:String(r[k.sex]).includes(c.femaleKey)?'F':'M',sp,s,a:+r[k.abs]||0,ins:String(r[k.ins]||'').trim(),sec:r[k.sec],g:grade(s,c),p:s>c.passAbove,
   grp:(sp==='غير محدد'||ex.some(x=>sp.includes(x)))?null:(/هندسة/.test(sp)?'eng':'sci')})}
 const ab=a=>a<=0?0:a<=c.abs1/100?1:a<=c.abs2/100?2:3,nb=Math.round(T/c.binW);
 const grpStat=rs=>{const h=Array(nb).fill(0);rs.forEach(r=>h[Math.min(Math.floor(r.s/c.binW),nb-1)]++);return{...st(rs,T),hist:h.map(x=>x/rs.length*100),bk:[0,1,2,3].map(i=>st(rs.filter(r=>ab(r.a)===i),T))}};
 const O={fixed,bad,total:R.length,secs:{},groups:[]};
 for(const [g,x] of [['eng','M'],['sci','M'],['sci','F'],['eng','F']]){const rs=R.filter(r=>r.grp===g&&r.sex===x);if(rs.length)O.groups.push({key:g+x,label:(x==='F'?'طالبات ':'طلاب ')+(g==='eng'?'الهندسة':'العلوم'),g,x,...grpStat(rs)})}
 for(const x of ['F','M']){const rs=R.filter(r=>r.sex===x);if(!rs.length)continue;const S={...st(rs,T),gc:GN.map((_,i)=>rs.filter(r=>r.g===i).length),nsec:new Set(rs.map(r=>r.sec)).size,bk:[0,1,2,3].map(i=>st(rs.filter(r=>ab(r.a)===i),T))};
  S.nEng=rs.filter(r=>r.grp==='eng').length;S.hasEng=S.nEng>rs.length/2;
  S.specs=[...by(rs,r=>r.sp)].map(([n,a])=>({name:n,...st(a,T)})).sort((a,b)=>b.pr-a.pr||b.n-a.n);
  const scope=S.hasEng?rs.filter(r=>r.grp==='sci'):rs;S.scopeN=scope.length;const te=c.topExcl.split(',').map(x=>x.trim());
  const sp5=[...by(scope,r=>r.sp)].map(([n,a])=>({name:n,...st(a,T)})).sort((a,b)=>b.n-a.n);
  S.top3=sp5.filter(s=>!te.includes(s.name)).slice(0,3);const t3=new Set(S.top3.map(s=>s.name)),tr=scope.filter(r=>t3.has(r.sp)),oth=scope.filter(r=>!t3.has(r.sp));
  S.t3={...st(tr,T),share:tr.length/scope.length*100,failShare:tr.filter(r=>!r.p).length/Math.max(1,scope.filter(r=>!r.p).length)*100,oth:st(oth,T)};
  const big=sp5.filter(s=>s.n>=c.minN),sm=scope.filter(r=>!big.some(b=>b.name===r.sp));S.sp5=big.map(b=>({...b}));if(sm.length)S.sp5.push({name:'تخصصات محدودة العدد',...st(sm,T),mean:mean(sm.map(r=>r.s))/T*100});
  let cols=ORD.filter(o=>rs.some(r=>colKey(r.sp)===o));const fold=S.hasEng,ck=sp=>{const q=colKey(sp);return fold&&['أحياء دقيقة','كيمياء','فيزياء','بيئية'].includes(q)?'علوم أخرى':q};
  S.cols=ORD.filter(o=>rs.some(r=>ck(r.sp)===o));
  S.ins=[...by(rs,r=>r.ins)].map(([n,a])=>({name:n,n:a.length,pr:st(a,T).pr,sh:S.cols.map(o=>a.filter(r=>ck(r.sp)===o).length/a.length*100)})).sort((a,b)=>b.n-a.n);
  O.secs[x]=S}
 return O}
function grpRange(S){const p=S.ins.map(i=>i.pr);return[Math.min(...p),Math.max(...p)]}

export function tapBpm(taps) {
 if(taps.length!==4) return null;
 const intervals=taps.slice(1).map((t,i)=>t-taps[i]);
 if(intervals.some(t=>!Number.isFinite(t)||t<=0)) return null;
 return 60000/(intervals.reduce((a,b)=>a+b,0)/3);
}

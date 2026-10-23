import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Skeleton, Table, money } from '../../ui';
import * as api from '../../services/api';
import { Stat, pname } from '../../components/common';

export default function AdminDashboard(){
  const db=api.useDb();const [stats,setStats]=useState<any>(null);const [error,setError]=useState('');
  useEffect(()=>{api.getAdminDashboardStats().then(setStats).catch((e:any)=>setError(e.message))},[db.orders.length,db.projects.length,db.buyers.length,db.sellers.length]);
  const orders=db.orders.map(o=>({...o,project:pname(db,o.projectId)}));
  const recentMonths=Array.from({length:6},(_,index)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-index));const key=d.toISOString().slice(0,7);return {label:d.toLocaleDateString(undefined,{month:'short'}),value:orders.filter(o=>o.status==='paid'&&o.date?.startsWith(key)).reduce((sum,o)=>sum+o.amount,0)}});
  const max=Math.max(1,...recentMonths.map(x=>x.value));
  return <div><h1>Admin dashboard</h1>{error&&<p className="err" role="alert">{error}</p>}{stats?<div className="stats">{[['Users',stats.users],['Buyers',stats.buyers],['Sellers',stats.sellers],['Published projects',stats.published],['Awaiting review',stats.pending],['Sales',money(stats.sales)],['Listing fees',money(stats.uploadRevenue)],['Commission',money(stats.commissions)],['Payouts in progress',money(stats.pendingPayouts)]].map(([label,value])=><Stat key={label as string} l={label as string} v={value}/>)}</div>:<Skeleton/>}
    <h2>Sales over the last six months</h2><svg viewBox="0 0 420 150" className="chart" role="img" aria-label="Verified paid sales over the last six months">{recentMonths.map((item,i)=><g key={item.label}><rect x={25+i*65} y={120-(item.value/max)*95} width="38" height={(item.value/max)*95} fill="currentColor"/><text x={23+i*65} y="140" fontSize="10">{item.label}</text></g>)}</svg>
    <h2>Recent orders</h2><Table search={false} size={6} rows={orders} cols={[
      ['id','Order',r=><Link to={`/admin/orders/${r.id}`}>{r.id}</Link>],['project','Project'],['date','Date'],['amount','Amount',r=>money(r.amount)],['status','Status',r=><Badge s={r.status}/>]
    ]}/>
  </div>;
}

import { useEffect, useState } from 'react';
import { Badge, Skeleton, Table, money } from '../../ui';
import * as api from '../../services/api';
import { Stat, pname } from '../../components/common';

export default function SellerEarnings(){const db=api.useDb();const [e,setE]=useState<any>(null);const [error,setError]=useState('');
  useEffect(()=>{api.getSellerEarnings().then(setE).catch((x:any)=>setError(x.message))},[db.orders.length]);
  const orders=db.orders.map(o=>({...o,project:pname(db,o.projectId),commission:o.commission ?? o.amount*db.settings.commissionRate,net:o.amount-(o.commission ?? o.amount*db.settings.commissionRate)-o.amount*db.settings.processingRate}));
  return <div><h1>Earnings</h1>{error&&<p className="err" role="alert">{error}</p>}{e?<div className="stats"><Stat l="Gross sales" v={money(e.gross)}/><Stat l={`Commission (${db.settings.commissionRate*100}%)`} v={money(e.commission)}/><Stat l="Processing estimate" v={money(e.fees)}/><Stat l="Net earnings" v={money(e.net)}/><Stat l="Payouts in progress" v={money(e.pendingPayouts)}/><Stat l="Completed payouts" v={money(e.completedPayouts)}/></div>:<Skeleton/>}
    <h2>Orders</h2><Table rows={orders} cols={[
      ['id','Order'],['project','Project'],['date','Date'],['amount','Gross',r=>money(r.amount)],['commission','Commission',r=>money(r.commission)],['net','Estimated net',r=>money(r.net)],['status','Status',r=><Badge s={r.status}/>]
    ]}/>
  </div>;
}

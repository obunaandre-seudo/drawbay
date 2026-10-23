import { useState } from 'react';
import { Badge, Field, Table, money } from '../../ui';
import * as api from '../../services/api';

export default function AdminPayouts(){
  const db=api.useDb(); const [sellerId,setSellerId]=useState(''); const [amount,setAmount]=useState(0); const [busy,setBusy]=useState(''); const [error,setError]=useState('');
  const rows=db.payouts.map(p=>({...p,seller:db.sellers.find(s=>s.id===p.sellerId)?.studio||p.sellerId}));
  const create=async(e:any)=>{e.preventDefault();setBusy('create');setError('');try{await api.createPayout(sellerId,amount);setAmount(0)}catch(e:any){setError(e.message)}finally{setBusy('')}};
  const send=async(id:string)=>{setBusy(id);setError('');try{await api.sendPayout(id)}catch(e:any){setError(e.message)}finally{setBusy('')}};
  return <div><h1>Seller payouts</h1><p>Paystack transfer requests are tracked here. Marking a payout complete is handled by signed provider webhooks.</p>
    <form className="row" onSubmit={create}><Field as="select" label="Seller" value={sellerId} onChange={(e:any)=>setSellerId(e.target.value)} required><option value="">Select seller</option>{db.sellers.map(s=><option key={s.id} value={s.id}>{s.studio}</option>)}</Field><Field type="number" min={1} label="Amount (NGN)" value={amount||''} onChange={(e:any)=>setAmount(Number(e.target.value))} required/><button className="btn" disabled={busy==='create'||!sellerId||amount<=0}>{busy==='create'?'Recording…':'Record payout request'}</button></form>
    {error&&<p role="alert" className="err">{error}</p>}
    <Table rows={rows} cols={[
      ['id','Payout'],['seller','Seller'],['amount','Amount',r=>money(r.amount)],['date','Date'],['status','Status',r=><Badge s={r.status}/>],
      ['action','Action',r=>r.status==='pending'?<button className="btn sm" disabled={busy===r.id} onClick={()=>send(r.id)}>{busy===r.id?'Sending…':'Send via Paystack'}</button>:r.status==='processing'?'Awaiting Paystack confirmation':'—']
    ]}/>
  </div>;
}

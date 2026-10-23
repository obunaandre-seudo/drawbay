import { useEffect, useState } from 'react';
import { Badge, Table, money } from '../../ui';
import * as api from '../../services/api';

export default function AdminUploadFees(){const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState('');
  useEffect(()=>{api.getUploadFees().then(setRows).catch((e:any)=>setError(e.message))},[]);
  return <div><h1>Listing-fee payments</h1><p>Paystack transactions are reconciled before a seller can submit a listing.</p>{error&&<p className="err" role="alert">{error}</p>}
    <Table rows={rows} cols={[
      ['id','Payment reference'],['seller','Seller'],['project','Project'],['amount','Amount',r=>money(r.amount)],['date','Date'],['status','Payment status',r=><Badge s={r.status}/>]
    ]}/>
  </div>;
}

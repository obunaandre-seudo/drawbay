import { useEffect, useState } from 'react';
import { Badge, Field, Table, money } from '../../ui';
import * as api from '../../services/api';

export default function SellerPayouts(){
  const db=api.useDb(); const [banks,setBanks]=useState<Array<{name:string;code:string}>>([]); const [account,setAccount]=useState<any>({});
  const [bankCode,setBankCode]=useState(''); const [number,setNumber]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{api.getBanks().then(setBanks).catch((e:any)=>setError(e.message));api.getPayoutAccount().then(setAccount).catch((e:any)=>setError(e.message))},[]);
  const save=async(e:any)=>{e.preventDefault();setBusy(true);setError('');try{const result=await api.savePayoutAccount(number,bankCode);setAccount(result);setNumber('')}catch(e:any){setError(e.message)}finally{setBusy(false)}};
  return <div><h1>Payouts</h1><p>Keep your verified payout destination current. DrawBay sends approved earnings through Paystack.</p>
    <Table rows={db.payouts} cols={[
      ['id','Payout'],['date','Date'],['amount','Amount',r=>money(r.amount)],['status','Status',r=><Badge s={r.status}/>]
    ]}/>
    <h2>Payout account</h2>{account.last4&&<p>Current destination: {account.accountName} · {account.bank} · ending {account.last4}</p>}
    <form className="narrow" onSubmit={save}><Field as="select" label="Nigerian bank" value={bankCode} onChange={(e:any)=>setBankCode(e.target.value)} required><option value="">Select a bank</option>{banks.map(b=><option key={b.code} value={b.code}>{b.name}</option>)}</Field>
      <Field label="10-digit account number" inputMode="numeric" autoComplete="off" value={number} onChange={(e:any)=>setNumber(e.target.value)} required/>
      {error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy||!bankCode||number.length!==10}>{busy?'Verifying…':'Verify and save account'}</button>
    </form><small>Your account number is sent over TLS to Paystack to create a transfer recipient. DrawBay stores only the provider reference and last four digits.</small>
  </div>;
}

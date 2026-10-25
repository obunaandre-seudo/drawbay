import { useState } from 'react';
import { Field } from '../../ui';
import * as api from '../../services/api';

export default function Contact(){
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [done,setDone]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const send=async(e:any)=>{e.preventDefault();setBusy(true);setError('');try{const result:any=await api.sendContactMessage(name,email,message);setDone(result.message);setName('');setEmail('');setMessage('')}catch(e:any){setError(e.message)}finally{setBusy(false)}};
  return <main className="wrap narrow"><h1>Contact Guaranteed Impressions</h1><p>Send the team a message about listings, purchases, or your seller account.</p>{done&&<p className="ok" role="status">{done}</p>}
    <form onSubmit={send}><Field label="Name" autoComplete="name" value={name} onChange={(e:any)=>setName(e.target.value)} required/><Field label="Email" type="email" autoComplete="email" value={email} onChange={(e:any)=>setEmail(e.target.value)} required/><Field as="textarea" label="Message" rows={6} value={message} onChange={(e:any)=>setMessage(e.target.value)} required/>{error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Sending…':'Send message'}</button></form>
  </main>;
}

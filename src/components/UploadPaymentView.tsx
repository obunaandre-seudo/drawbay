import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { money } from '../ui';
import * as api from '../services/api';

export function UploadPaymentView({res}:{res?:'success'|'failed'|'pending'}) {
  const db=api.useDb(); const [params]=useSearchParams(); const id=params.get('project');
  const reference=params.get('reference'); const project=db.projects.find(x=>x.id===id);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [paid,setPaid]=useState(false); const nav=useNavigate();
  useEffect(()=>{
    if(!reference)return;
    setBusy(true);
    api.verifyPayment(reference).then(async result=>{
      if(result.status!=='success'||result.purpose!=='upload_fee')throw new Error('The listing fee is not confirmed yet. Check again shortly.');
      await api.refreshDb();setPaid(true);
    }).catch((e:any)=>setError(e.message)).finally(()=>setBusy(false));
  },[reference]);
  if(!project)return <div><h1>Project not found</h1><Link to="/seller/projects">Back to my projects</Link></div>;
  const start=async()=>{setBusy(true);setError('');try{const result=await api.startUploadFeePayment(project.id);window.location.assign(result.authorizationUrl)}catch(e:any){setError(e.message);setBusy(false)}};
  const submit=async()=>{setBusy(true);setError('');try{const ok=await api.submitProjectForReview(project.id);if(!ok)throw new Error('Complete the project files before submitting it for review.');nav('/seller/projects')}catch(e:any){setError(e.message);setBusy(false)}};
  if(paid)return <div><h1>Listing fee paid</h1><p>{project.title} is ready to enter the review queue.</p>{error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy} onClick={submit}>{busy?'Submitting…':'Submit for review'}</button></div>;
  if(res==='failed')return <div><h1>Payment could not be confirmed</h1><p>{error||'Return to your project and retry the listing fee payment.'}</p><Link className="btn" to={`/seller/upload-payment?project=${project.id}`}>Try again</Link></div>;
  if(res==='pending'||reference)return <div><h1>Confirming listing fee</h1><p>{error||'We are checking the payment provider. You can safely check again.'}</p>{busy&&<p aria-busy="true">Checking…</p>}{error&&reference&&<button className="btn" disabled={busy} onClick={()=>window.location.reload()}>Check again</button>}</div>;
  return <div><h1>Listing fee</h1><p>Pay the Guaranteed Impressions listing fee to submit this project for review.</p><p>{project.title} — <strong>{money(db.settings.uploadFee)}</strong></p>{error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy} onClick={start}>{busy?'Connecting to Paystack…':'Pay securely with Paystack'}</button></div>;
}

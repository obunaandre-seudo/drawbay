import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { refreshDb, verifyPayment } from '../services/api';

export const CheckoutResult = ({ok}:{ok:boolean}) => {
  const [params]=useSearchParams(); const [state,setState]=useState<'checking'|'success'|'failed'>(ok?'checking':'failed');
  const [message,setMessage]=useState('Confirming your payment…');
  useEffect(()=>{
    if(!ok)return;
    const reference=params.get('reference');
    if(!reference){setState('failed');setMessage('We could not find the payment reference. Check your purchases or contact support.');return;}
    verifyPayment(reference).then(async result=>{
      if(result.status!=='success')throw new Error('Payment is not confirmed yet. Please refresh this page in a moment.');
      await refreshDb();setState('success');setMessage('Your payment is confirmed. Your purchased plans are now available in your account.');
    }).catch((error:any)=>{setState('failed');setMessage(error.message||'We could not confirm the payment.');});
  },[ok,params]);
  return <main className="center"><h1>{state==='checking'?'Checking payment':state==='success'?'Payment confirmed':'Payment not confirmed'}</h1><p role="status">{message}</p>
    {state==='checking'?<p aria-busy="true">Please wait…</p>:<div className="row" style={{justifyContent:'center'}}><Link className="btn" to={state==='success'?'/buyer/purchases':'/marketplace'}>{state==='success'?'View purchases':'Back to marketplace'}</Link>{state==='failed'&&<Link to="/buyer/support">Contact support</Link>}</div>}
  </main>;
};

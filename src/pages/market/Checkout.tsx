import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, money } from '../../ui';
import { startCheckout, useDb } from '../../services/api';

export function Checkout() {
  const db=useDb(); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const items=db.cart.flatMap(c=>{const p=db.projects.find(p=>p.id===c.id&&p.status==='published');return p?[{projectId:p.id,qty:c.qty,p}]:[]});
  const total=items.reduce((sum,item)=>sum+item.p.price*item.qty,0);
  if(!items.length)return <main className="wrap"><Empty text="Your cart is empty." to="/marketplace" cta="Browse marketplace"/></main>;
  const checkout=async()=>{setBusy(true);setError('');try{await startCheckout(items.map(({projectId,qty})=>({projectId,qty})))}catch(e:any){setError(e.message);setBusy(false)}};
  return <main className="wrap narrow"><h1>Secure checkout</h1><p>Review your architectural plans before continuing to Paystack for payment.</p>
    <div className="card pad">{items.map(i=><div className="row between line" key={i.projectId}><span>{i.p.title} <small>× {i.qty}</small></span><strong>{money(i.p.price*i.qty)}</strong></div>)}<h2>Total {money(total)}</h2></div>
    {!db.session&&<p className="note">Sign in or create a buyer account to continue. Your cart will be kept while you sign in.</p>}
    {error&&<p role="alert" className="err">{error}</p>}
    <div className="row"><button className="btn" onClick={checkout} disabled={busy}>{busy?'Connecting to payment…':db.session?'Continue to Paystack':'Sign in to continue'}</button><Link to="/cart">Edit cart</Link></div>
    <small>Payments are verified securely by Guaranteed Impressions before files become available.</small>
  </main>;
}
export default Checkout;

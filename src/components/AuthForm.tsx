import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Field, Logo } from '../ui';
import * as api from '../services/api';
import type { Role } from '../types';

export function AuthForm({role,mode}:{role:Role;mode:'sign-in'|'sign-up'|'forgot-password'|'reset-password'|'verify-email'}) {
  const nav=useNavigate(); const [params]=useSearchParams();
  const [v,setV]=useState<any>({email:params.get('email')||'',password:'',name:'',confirm:''});
  const [err,setErr]=useState<any>({}); const [busy,setBusy]=useState(false); const [done,setDone]=useState('');
  const set=(k:string)=>(e:any)=>setV({...v,[k]:e.target.value});
  const token=params.get('token')||'';
  useEffect(()=>{ if(mode==='verify-email'&&token){setBusy(true);api.verifyEmail(token).then((r:any)=>setDone(r.message)).catch((e:any)=>setErr({form:e.message})).finally(()=>setBusy(false));} },[mode,token]);
  const submit=async(e:any)=>{
    e.preventDefault(); const x:any={};
    if(mode!=='reset-password'&&!/^\S+@\S+\.\S+$/.test(v.email||''))x.email='Enter a valid email address';
    if(['sign-in','sign-up','reset-password'].includes(mode)&&(v.password||'').length<(mode==='sign-in'?1:12))x.password=mode==='sign-in'?'Enter your password':'Use at least 12 characters';
    if(['sign-up','reset-password'].includes(mode)&&v.password!==v.confirm)x.confirm='Passwords do not match';
    if(mode==='sign-up'&&(v.name||'').trim().length<2)x.name='Enter your full name';
    if(mode==='reset-password'&&!token)x.form='This reset link is missing or invalid';
    setErr(x);if(Object.keys(x).length)return;
    setBusy(true);
    try{
      if(mode==='sign-in'){await api.signIn(role,v.email,v.password);const target=params.get('returnTo')||`/${role}/dashboard`;nav(target.startsWith('/')&&!target.startsWith('//')?target:`/${role}/dashboard`,{replace:true});return;}
      if(mode==='sign-up'){const r:any=await api.signUp(role as Exclude<Role,'admin'>,v.name,v.email,v.password);setDone(r.message||'Account created. You can now sign in.');return;}
      if(mode==='forgot-password'){const r:any=await api.requestPasswordReset(v.email);setDone(r.message);return;}
      if(mode==='reset-password'){const r:any=await api.resetPassword(token,v.password);setDone(r.message);return;}
    }catch(error:any){setErr({form:error.message});}
    finally{setBusy(false);}
  };
  const title={ 'sign-in':'Sign in','sign-up':'Create account','forgot-password':'Reset your password','reset-password':'Choose a new password','verify-email':'Verify your email' }[mode];
  return <main className="authbox"><Link to="/"><Logo/></Link><h1>{role[0].toUpperCase()+role.slice(1)} · {title}</h1>
    {mode==='verify-email'?<div>{err.form&&<p className="err" role="alert">{err.form}</p>}{done?<><p className="ok" role="status">{done}</p><Link className="btn" to={`/${role}/sign-in`}>Continue to sign in</Link></>:busy?<p role="status">Verifying your link…</p>:<><p>Use the verification link we sent to your email address.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r:any=await api.resendVerification(v.email);setDone(r.message)}catch(ex:any){setErr({form:ex.message})}finally{setBusy(false)}}}><Field label="Email" type="email" value={v.email} onChange={set('email')}/><button className="btn" disabled={busy}>Resend verification email</button></form></>}</div>:
    <>{done?<p className="ok" role="status">{done}</p>:<form onSubmit={submit} noValidate>
      {mode==='sign-up'&&<Field label="Full name" autoComplete="name" value={v.name} onChange={set('name')} error={err.name}/>}
      {mode!=='reset-password'&&<Field label="Email" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={err.email}/>}
      {['sign-in','sign-up','reset-password'].includes(mode)&&<Field label="Password" type="password" autoComplete={mode==='sign-in'?'current-password':'new-password'} value={v.password} onChange={set('password')} error={err.password}/>}
      {['sign-up','reset-password'].includes(mode)&&<Field label="Confirm password" type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} error={err.confirm}/>}
      {err.form&&<p className="err" role="alert">{err.form}</p>}
      <button className="btn" disabled={busy}>{busy?'Please wait…':title}</button>
    </form>}</>}
    <p className="links">{mode!=='sign-in'&&mode!=='verify-email'&&<Link to={`/${role}/sign-in`}>Sign in</Link>} {role!=='admin'&&mode!=='sign-up'&&<Link to={`/${role}/sign-up`}>Create account</Link>} {role!=='admin'&&mode==='sign-in'&&<Link to={`/${role}/forgot-password`}>Forgot password?</Link>} {mode==='forgot-password'&&<Link to={`/${role}/reset-password`}>I have a reset link</Link>}</p>
  </main>;
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Empty, Field, Table, toast } from '../ui';
import * as api from '../services/api';

export const Stat = ({l,v}:{l:string;v:any}) => <div className="stat"><small>{l}</small><strong>{v}</strong></div>;
export const pname = (db:any,id:string)=>db.projects.find((p:any)=>p.id===id)?.title||id;

export function Notifs(){const db=api.useDb();return <div><h1>Notifications</h1>{db.notifications.length?<ul className="list">{db.notifications.map((n,i)=><li key={i}>{n}</li>)}</ul>:<Empty text="No notifications yet."/>}</div>}

export function Support(){
  const db=api.useDb();const [subject,setSubject]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const send=async(e:any)=>{e.preventDefault();setBusy(true);setError('');try{await api.createSupportTicket(subject,message);setSubject('');setMessage('');toast('Support request sent')}catch(e:any){setError(e.message)}finally{setBusy(false)}};
  return <div><h1>Support</h1><form className="narrow" onSubmit={send}><Field label="Subject" value={subject} onChange={(e:any)=>setSubject(e.target.value)} required/><Field as="textarea" rows={5} label="How can we help?" value={message} onChange={(e:any)=>setMessage(e.target.value)} required/>{error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Sending…':'Send request'}</button></form><h2>Your requests</h2><Table rows={db.support} cols={[
    ['id','Reference'],['subject','Subject'],['status','Status',r=><Badge s={r.status}/>]
  ]}/></div>;
}

export function ProfileForm({title,pw,setup}:{title:string;pw?:boolean;setup?:boolean}){
  const db=api.useDb();const nav=useNavigate();const user=db.currentUser;const seller=db.sellers.find(s=>s.id===user?.id);
  const [name,setName]=useState(user?.name||'');const [studio,setStudio]=useState(seller?.studio||'');const [bio,setBio]=useState(seller?.bio||'');const [location,setLocation]=useState(seller?.location||'');
  const [currentPassword,setCurrentPassword]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const save=async(e:any)=>{e.preventDefault();setError('');if(pw&&password&&password!==confirm){setError('New passwords do not match');return}setBusy(true);try{await api.updateProfile({name,studio,bio,location});if(pw&&password){await api.changePassword(currentPassword,password);setCurrentPassword('');setPassword('');setConfirm('')}toast('Account updated');if(setup)nav('/seller/dashboard')}catch(e:any){setError(e.message)}finally{setBusy(false)}};
  return <div><h1>{title}</h1>{setup&&<p>Complete your public studio profile so buyers can learn about your work.</p>}<form className="narrow" onSubmit={save}>
    <Field label="Display name" value={name} onChange={(e:any)=>setName(e.target.value)} required minLength={2}/>
    {setup&&<><Field label="Studio or business name" value={studio} onChange={(e:any)=>setStudio(e.target.value)} required/><Field as="textarea" rows={4} label="Studio biography" value={bio} onChange={(e:any)=>setBio(e.target.value)}/><Field label="Location" value={location} onChange={(e:any)=>setLocation(e.target.value)}/></>}
    <Field label="Email" type="email" value={user?.email||''} disabled readOnly/>
    {pw&&<fieldset><legend>Change password</legend><Field label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e:any)=>setCurrentPassword(e.target.value)}/><Field label="New password (12 characters minimum)" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e:any)=>setPassword(e.target.value)}/><Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e:any)=>setConfirm(e.target.value)}/></fieldset>}
    {error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Saving…':'Save changes'}</button>
  </form></div>;
}

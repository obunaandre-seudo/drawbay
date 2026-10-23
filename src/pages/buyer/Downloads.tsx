import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Empty, Table } from '../../ui';
import * as api from '../../services/api';
import { pname } from '../../components/common';

export default function BuyerDownloads(){
  const db=api.useDb();const [files,setFiles]=useState<Record<string,Array<{name:string;url:string}>>>({});const [busy,setBusy]=useState('');const [error,setError]=useState('');
  const orders=db.orders.filter(o=>o.status==='paid');
  const load=async(id:string)=>{setBusy(id);setError('');try{const result=await api.getOrderDownloads(id);setFiles(old=>({...old,[id]:result}))}catch(e:any){setError(e.message)}finally{setBusy('')}};
  if(!orders.length)return <div><h1>Purchased files</h1><Empty text="Your paid project downloads will appear here." to="/marketplace" cta="Browse plans"/></div>;
  return <div><h1>Purchased files</h1>{error&&<p className="err" role="alert">{error}</p>}<Table rows={orders.map(o=>({...o,project:pname(db,o.projectId)}))} cols={[
    ['project','Project'],['date','Purchased'],['status','Order status',r=><Badge s={r.status}/>],
    ['downloads','Files',r=><div>{files[r.id]?files[r.id].map((file,i)=><p key={i}><a href={file.url} target="_blank" rel="noreferrer">Download {file.name}</a></p>):<button className="btn sm" disabled={busy===r.id} onClick={()=>load(r.id)}>{busy===r.id?'Getting files…':'Get download links'}</button>}</div>]
  ]}/><p className="note">Download links expire after five minutes. You can request new links here at any time.</p></div>;
}

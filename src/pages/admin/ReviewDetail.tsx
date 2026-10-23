import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

function Review(){ const {id}=useParams(); const db=useDb(); const nav=useNavigate(); const p=db.projects.find(x=>x.id===id); const [a,setA]=useState<''|'approve'|'reject'|'changes'>(''); const [r,setR]=useState(''); if(!p)return <Empty text="Project not found."/>;
  const ok=async()=>{try{if(a==='approve')await api.approveProject(p.id);else await api.rejectProject(p.id,r,a==='changes');toast('Listing status updated');nav('/admin/reviews')}catch(e:any){toast(e.message)}};
  return <div><h1>{p.title}</h1><Badge s={p.status}/><div className="detail"><Img src={p.img} alt={`${p.title} render`} className="cover"/><div><p>{p.desc}</p><p>{money(p.price)} · {p.category} · {p.style} · {p.bedrooms} bd / {p.bathrooms} ba / {p.floors} fl</p><p>Seller: {db.sellers.find(s=>s.id===p.sellerId)?.studio} · Listing fee: confirmed</p><p>Deliverables: {p.files.join(', ')}</p><div className="row"><button className="btn" onClick={()=>setA('approve')}>Approve</button><button className="btn ghost" onClick={()=>setA('changes')}>Request changes</button><button className="btn ghost" onClick={()=>setA('reject')}>Reject</button></div></div></div>
  {a&&<Confirm title={`Confirm: ${a}`} onOk={ok} onCancel={()=>setA('')} disabled={a!=='approve'&&!r.trim()}>{a!=='approve'&&<Field as="textarea" label="Reason / feedback (required)" value={r} onChange={(e:any)=>setR(e.target.value)}/>}</Confirm>}</div>; }

export default Review;

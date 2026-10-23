import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export function SellerProject(){ const db=useDb(); const {id}=useParams(); const p=db.projects.find(x=>x.id===id); const nav=useNavigate(); if(!p)return <Empty text="Project not found." to="/seller/projects" cta="My projects"/>; 
  return <div><h1>{p.title}</h1><Badge s={p.status}/><div className="detail"><Img src={p.img} alt={`${p.title} preview`} className="cover"/><div><p>{p.desc}</p><p>{money(p.price)} · {p.category} · submitted {p.date}</p>{p.feedback&&<p className="note"><strong>Admin feedback:</strong> {p.feedback}</p>}<div className="row">{['draft','awaiting_fee','changes_requested','rejected'].includes(p.status)&&<Link className="btn" to={`/seller/projects/${p.id}/edit`}>Edit & resubmit</Link>}{p.status==='awaiting_fee'&&<Link className="btn ghost" to={`/seller/upload-payment?project=${p.id}`}>Pay upload fee</Link>}{p.status==='published'&&<button className="btn ghost" onClick={()=>{api.updateProject(p.id,{status:'archived'});nav('/seller/projects')}}>Archive</button>}</div></div></div></div>; }
export default SellerProject;

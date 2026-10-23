import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export function ProjectPage() {
  const {slug:s}=useParams(); const db=useDb(); const [p,setP]=useState<Project|null|undefined>(undefined); useEffect(()=>{getProjectBySlug(s).then(x=>setP(x||null))},[s,db.projects]);
  if(p===undefined)return <main className="wrap"><Skeleton/></main>; if(!p)return <StatePage title="Project not found" text="This project is unavailable." to="/projects" cta="Browse projects"/>;
  const sel=db.sellers.find(x=>x.id===p.sellerId);
  return <main className="wrap"><nav className="crumbs"><Link to="/projects">Projects</Link> / {p.title}</nav><div className="detail"><div><Img src={p.img} alt={`${p.title} main render`} className="cover big"/><div className="grid2"><Img src={p.img} alt={`${p.title} gallery view`} className="cover"/><svg viewBox="0 0 200 140" className="plan" role="img" aria-label="Floor plan preview"><rect x="10" y="10" width="180" height="120" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M10 70h100M110 10v120M110 90h80" stroke="currentColor" fill="none"/></svg></div></div>
  <div><small>{p.category}</small><h1>{p.title}</h1><p>{p.desc}</p><p className="price">{money(p.price)}</p><ul className="specs"><li>Style: {p.style}</li><li>Bedrooms: {p.bedrooms}</li><li>Bathrooms: {p.bathrooms}</li><li>Floors: {p.floors}</li></ul><h3>Included deliverables</h3><ul>{p.files.map(x=><li key={x}>{x}</li>)}</ul><p>Seller: <Link to={`/sellers/${sel?.slug}`}>{sel?.studio}</Link></p><div className="row"><button className="btn" onClick={()=>{cartAdd(p.id);toast('Added to cart')}}>Add to cart</button><button className="btn ghost" onClick={()=>toggleWishlist(p.id)}>{db.wishlist.includes(p.id)?'Remove from wishlist':'Save'}</button></div></div></div></main>;
}
export default ProjectPage;

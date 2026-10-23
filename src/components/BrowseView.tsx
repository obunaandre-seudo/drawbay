import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../ui';
import * as api from '../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../services/api';
import type { Project, Role } from '../types';
import { Stat, pname, Notifs, ProfileForm, Support } from './common';

export function BrowseView({mode}:{mode:'market'|'all'|'category'|'search'}) {
  const db=useDb(); const {slug:cs}=useParams(); const [sp,setSp]=useSearchParams(); const q=sp.get('q')||'';
  const [all,setAll]=useState<Project[]|null>(null); const [f,setF]=useState<any>({cat:'',style:'',beds:0,baths:0,floors:0,max:0,sort:'featured'}); const [list,setList]=useState(false); const [n,setN]=useState(6);
  useEffect(()=>{setAll(null);(mode==='search'?searchProjects(q):getProjects()).then(setAll)},[mode,q,db.projects]);
  const catName=db.categories.find(c=>slug(c)===cs);
  let r=(all||[]).filter(p=>(!catName||p.category===catName)&&(!f.cat||p.category===f.cat)&&(!f.style||p.style===f.style)&&p.bedrooms>=f.beds&&p.bathrooms>=f.baths&&(!f.floors||p.floors===+f.floors)&&(!f.max||p.price<=f.max));
  r=[...r].sort((a,b)=>f.sort==='newest'?b.date.localeCompare(a.date):f.sort==='low'?a.price-b.price:f.sort==='high'?b.price-a.price:f.sort==='popular'?b.popularity-a.popularity:+b.featured-+a.featured);
  const set=(k:string)=>(e:any)=>{setF({...f,[k]:e.target.value});setN(6)};
  return <main className="wrap"><h1>{mode==='category'?catName||'Category':mode==='search'?`Search: “${q}”`:mode==='market'?'Marketplace':'All projects'}</h1>
  <form className="row" role="search" onSubmit={e=>{e.preventDefault();const v=(e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;setSp({q:v});if(mode!=='search')location.assign('/search?q='+encodeURIComponent(v))}}><input name="q" className="search" aria-label="Search projects" placeholder="Search title, style, category or seller" defaultValue={q}/><button className="btn">Search</button></form>
  <div className="row filters"><Field as="select" label="Type" value={f.cat} onChange={set('cat')}><option value="">All</option>{db.categories.map(c=><option key={c}>{c}</option>)}</Field><Field as="select" label="Style" value={f.style} onChange={set('style')}><option value="">All</option>{['Modern','Contemporary','Minimalist','Traditional','Organic'].map(c=><option key={c}>{c}</option>)}</Field><Field as="select" label="Bedrooms" value={f.beds} onChange={set('beds')}>{[0,1,2,3,4,5].map(c=><option key={c} value={c}>{c}+</option>)}</Field><Field as="select" label="Bathrooms" value={f.baths} onChange={set('baths')}>{[0,1,2,3,4].map(c=><option key={c} value={c}>{c}+</option>)}</Field><Field as="select" label="Floors" value={f.floors} onChange={set('floors')}><option value="0">Any</option>{[1,2,3,4].map(c=><option key={c}>{c}</option>)}</Field><Field as="select" label="Max price" value={f.max} onChange={set('max')}><option value="0">Any</option>{[100000,300000,500000,1000000].map(c=><option key={c} value={c}>{money(c)}</option>)}</Field><Field as="select" label="Sort" value={f.sort} onChange={set('sort')}><option value="featured">Featured</option><option value="newest">Newest</option><option value="popular">Popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></Field><button className="btn ghost" onClick={()=>setList(!list)}>{list?'Grid':'List'} view</button></div>
  <p className="cats">{db.categories.map(c=><Link key={c} to={`/categories/${slug(c)}`}>{c}</Link>)}</p>
  {!all?<Skeleton/>:r.length===0?<Empty text="No projects match your filters." to="/projects" cta="Clear and browse all"/>:<><div className={list?'list':'grid'}>{r.slice(0,n).map(p=><Card key={p.id} p={p}/>)}</div>{n<r.length&&<button className="btn ghost" onClick={()=>setN(n+6)}>Load more</button>}</>}</main>;
}

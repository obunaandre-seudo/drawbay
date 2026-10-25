import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useDb, toggleWishlist } from './services/api';
import type { Project } from './types';
export const money = (n:number) => new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n||0);
export const slug = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const Logo = () => <span className="logo"><img src="/ves.png" alt="" aria-hidden="true"/><span className="logo-name">Guaranteed<br/>Impressions</span></span>;
export function ThemeToggle() {
  const [dark,setDark] = useState(() => {
    const saved = localStorage.getItem('drawbay:theme');
    return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('drawbay:theme',dark ? 'dark' : 'light');
  },[dark]);
  return <button className="theme-toggle" type="button" onClick={()=>setDark(value=>!value)} aria-label={`Switch to ${dark?'light':'dark'} mode`} aria-pressed={dark} title={`Switch to ${dark?'light':'dark'} mode`}>
    {dark ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A8.7 8.7 0 0 1 11 3.1 8.8 8.8 0 1 0 20.9 13Z"/></svg>}
    <span>{dark?'Light':'Dark'} mode</span>
  </button>;
}
export function Img({src,alt,className=''}:{src?:string;alt:string;className?:string}) {
  const [bad,setBad] = useState(!src);
  return bad ? <div className={'img-fallback '+className} role="img" aria-label={alt}><Logo/></div> : <img className={className} src={src} alt={alt} loading="lazy" decoding="async" onError={()=>setBad(true)}/>;
}
const L:Record<string,string> = {draft:'Draft',awaiting_fee:'Awaiting upload-fee payment',payment_pending:'Payment pending',in_review:'Awaiting admin review',changes_requested:'Changes requested',published:'Approved & published',rejected:'Rejected',archived:'Archived',paid:'Paid',refunded:'Refunded',disputed:'Disputed',pending:'Pending',completed:'Completed',open:'Open',closed:'Closed'};
export const Badge = ({s}:{s:string}) => <span className={'badge b-'+s}>{L[s]||s}</span>;
let push:(m:string)=>void = ()=>{};
export const toast = (m:string) => push(m);
export function Toaster() { const [m,setM]=useState<string[]>([]); useEffect(()=>{push=(x)=>{setM(a=>[...a,x]);setTimeout(()=>setM(a=>a.slice(1)),3200)}},[]); return <div className="toasts" role="status" aria-live="polite">{m.map((x,i)=><div key={i} className="toast">{x}</div>)}</div>; }
export function Confirm({title,children,onOk,onCancel,okLabel='Confirm',disabled}:{title:string;children?:ReactNode;onOk:()=>void;onCancel:()=>void;okLabel?:string;disabled?:boolean}) {
  useEffect(()=>{const k=(e:KeyboardEvent)=>e.key==='Escape'&&onCancel();addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);
  return <div className="overlay"><div className="modal" role="dialog" aria-modal="true" aria-label={title}><h3>{title}</h3>{children}<div className="row end"><button className="btn ghost" onClick={onCancel}>Cancel</button><button className="btn" disabled={disabled} onClick={onOk}>{okLabel}</button></div></div></div>;
}
export const Field = ({label,error,...p}:any) => <label className="field"><span>{label}</span>{p.as==='textarea'?<textarea {...p} aria-invalid={!!error}/>:p.as==='select'?<select {...p} aria-invalid={!!error}>{p.children}</select>:<input {...p} aria-invalid={!!error}/>}{error&&<em role="alert" className="err">{error}</em>}</label>;
export const Skeleton = () => <div className="grid">{[0,1,2].map(i=><div key={i} className="card skel"/>)}</div>;
export const Empty = ({text,to,cta}:{text:string;to?:string;cta?:string}) => <div className="empty"><p>{text}</p>{to&&<Link className="btn" to={to}>{cta}</Link>}</div>;
export function Table({cols,rows,size=6,search=true}:{cols:[string,string,((r:any)=>ReactNode)?][];rows:any[];size?:number;search?:boolean}) {
  const [q,setQ]=useState(''); const [pg,setPg]=useState(0);
  const f = rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase())); const pages=Math.max(1,Math.ceil(f.length/size));
  return <div>{search&&<input className="search" placeholder="Filter…" aria-label="Filter table" value={q} onChange={e=>{setQ(e.target.value);setPg(0)}}/>}
  {f.length===0?<Empty text="Nothing to show yet."/>:<div className="tablewrap"><table><thead><tr>{cols.map(c=><th key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{f.slice(pg*size,pg*size+size).map((r,i)=><tr key={i}>{cols.map(c=><td key={c[0]}>{c[2]?c[2](r):String(r[c[0]]??'')}</td>)}</tr>)}</tbody></table></div>}
  <div className="row end pager"><button className="btn ghost" disabled={pg===0} onClick={()=>setPg(pg-1)}>Prev</button><span>{pg+1} / {pages}</span><button className="btn ghost" disabled={pg+1>=pages} onClick={()=>setPg(pg+1)}>Next</button></div></div>;
}
export const Detail = ({title,obj}:{title:string;obj:any}) => !obj?<Empty text="Record not found."/>:<div><h1>{title}</h1><dl className="dl">{Object.entries(obj).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{typeof v==='object'?JSON.stringify(v):String(v)}</dd></div>)}</dl></div>;
export function Card({p}:{p:Project}) {
  const db=useDb(); const s=db.sellers.find(x=>x.id===p.sellerId); const saved=db.wishlist.includes(p.id);
  return <article className="card"><Link to={`/projects/${p.slug}`}><Img src={p.img} alt={`${p.title} exterior render`} className="cover"/></Link><div className="pad"><small>{p.category}</small><h3><Link to={`/projects/${p.slug}`}>{p.title}</Link></h3><small>by <Link to={`/sellers/${s?.slug}`}>{s?.studio}</Link> · {p.style}</small><div className="row between"><strong>{money(p.price)}</strong><button className="btn ghost sm" aria-pressed={saved} onClick={()=>{toggleWishlist(p.id);toast(saved?'Removed from wishlist':'Saved to wishlist')}}>{saved?'Saved ✓':'Save'}</button></div></div></article>;
}
export function StatePage({title,text,to='/',cta='Back home'}:{title:string;text:string;to?:string;cta?:string}) { return <main className="center"><Logo/><h1>{title}</h1><p>{text}</p><Link className="btn" to={to}>{cta}</Link></main>; }

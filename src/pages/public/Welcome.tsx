import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

const HERO='https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=70';
export function Welcome() { const db=useDb(); const f=db.projects.filter(p=>p.status==='published'&&p.featured).slice(0,3);
 return <><section className="hero home-hero"><Img src={HERO} alt="Contemporary house with large glazing at dusk" className="herobg"/><div className="herotxt"><small>THE MARKETPLACE FOR ARCHITECTURAL DESIGN</small><h1>Plans for the places we call home.</h1><p>Explore architectural plans, detailed drawings and visualizations from independent design studios.</p><div className="row"><Link className="btn" to="/marketplace">Explore the marketplace</Link><Link className="btn ghost light" to="/seller/sign-up">Sell your work</Link></div></div></section>
 <section className="wrap"><div className="row between"><h2>Browse by project type</h2><Link to="/projects">View all projects</Link></div><p className="cats">{db.categories.slice(0,6).map(c=><Link className="btn ghost sm" key={c} to={`/categories/${slug(c)}`}>{c}</Link>)}</p></section>
 <section className="wrap"><div className="row between"><h2>Featured designs</h2><Link to="/marketplace">Browse all plans</Link></div>{f.length?<div className="grid">{f.map(p=><Card key={p.id} p={p}/>)}</div>:<p className="note">New designs are being prepared. Check the marketplace soon.</p>}</section>
 <section className="wrap cols3">{[['For buyers','Browse approved plans with drawings, specifications and visualizations, then purchase the files you need.'],['For creators','Publish your architectural work and earn when buyers purchase your project.'],['Reviewed listings','Every seller submission is reviewed before it appears in the marketplace.']].map(([t,d])=><div key={t} className="card pad"><h3>{t}</h3><p>{d}</p></div>)}</section>
 <section className="wrap"><h2>How it works</h2><ol className="steps"><li>Create a buyer or seller account.</li><li>Sellers upload previews and deliverables, pay the listing fee and submit for review.</li><li>Buyers pay securely and download purchased files from their account.</li></ol></section></>; }
export default Welcome;

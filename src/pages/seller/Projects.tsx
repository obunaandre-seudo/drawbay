import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export default function SellerProjects(){  const db=useDb(); 
  const mine=db.projects.filter(p=>p.sellerId===db.currentUser?.id); const ord=db.orders.filter(o=>o.sellerId===db.currentUser?.id).map(o=>({...o,project:pname(db,o.projectId),commission:o.commission ?? o.amount*db.settings.commissionRate,net:o.amount-(o.commission ?? o.amount*db.settings.commissionRate)-o.amount*db.settings.processingRate}));
 const k:string='projects';
 return (<div><h1>My projects</h1><Table rows={mine} cols={[['title','Project',r=><Link to={`/seller/projects/${r.id}`}>{r.title}</Link>],['status','Status',r=><Badge s={r.status}/>],['date','Submitted'],['price','Price',r=>money(r.price)],['a','',r=>['changes_requested','rejected','draft','awaiting_fee'].includes(r.status)?<Link to={`/seller/projects/${r.id}/edit`}>Edit/resubmit</Link>:null]]}/>{!mine.length&&<Empty text="No projects yet." to="/seller/projects/new" cta="Upload your first"/>}</div>);
}

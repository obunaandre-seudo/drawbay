import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

function Reviews(){ const db=useDb(); const [cat,setCat]=useState(''); const rows=db.projects.filter(p=>p.status==='in_review'&&(!cat||p.category===cat)).map(p=>({...p,seller:db.sellers.find(x=>x.id===p.sellerId)?.studio}));
  return <div><h1>Review queue</h1><Field as="select" label="Category" value={cat} onChange={(e:any)=>setCat(e.target.value)}><option value="">All</option>{db.categories.map(c=><option key={c}>{c}</option>)}</Field><Table rows={rows} cols={[['title','Project',r=><Link to={`/admin/reviews/${r.id}`}>{r.title}</Link>],['seller','Seller'],['category','Category'],['date','Submitted'],['status','Status',r=><Badge s={r.status}/>]]}/></div>; }

export default Reviews;

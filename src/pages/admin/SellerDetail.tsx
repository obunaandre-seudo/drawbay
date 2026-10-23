import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export default function AdminSellerDetail(){  const db=useDb(); const {id}=useParams(); 
  const sn=(i:string)=>db.sellers.find(s=>s.id===i)?.studio; const ords=db.orders.map(o=>({...o,project:pname(db,o.projectId),buyer:db.buyers.find(b=>b.id===o.buyerId)?.name,commission:o.commission ?? o.amount*db.settings.commissionRate}));
  const link=(p:string)=>(r:any)=><Link to={`/admin/${p}/${r.id}`}>{r.id}</Link>; const st2=(r:any)=><Badge s={r.status}/>;
 const k:string='seller';
 return (<Detail title="Seller" obj={db.sellers.find(s=>s.id===id)}/>);
}

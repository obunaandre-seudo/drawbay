import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export default function AdminOrderDetail(){  const db=useDb(); const {id}=useParams(); 
  const sn=(i:string)=>db.sellers.find(s=>s.id===i)?.studio; const ords=db.orders.map(o=>({...o,project:pname(db,o.projectId),buyer:db.buyers.find(b=>b.id===o.buyerId)?.name,commission:o.commission ?? o.amount*db.settings.commissionRate}));
 const link=(p:string)=>(r:any)=><Link to={`/admin/${p}/${r.id}`}>{r.id}</Link>; const st2=(r:any)=><Badge s={r.status}/>;
 const order=ords.find(o=>o.id===id);
 const refund=async()=>{const reason=window.prompt('Reason for refund (5–500 characters):');if(!reason)return;try{await api.refundOrder(id!,reason);toast('Refund requested from Paystack; status updates when the provider confirms it.')}catch(e){toast(e instanceof Error?e.message:'Refund request failed.')}};
 const k:string='order';
 return (<><Detail title="Order" obj={order}/>{order?.status==='paid'&&<button className="btn danger" onClick={()=>void refund()}>Request refund</button>}</>);
}

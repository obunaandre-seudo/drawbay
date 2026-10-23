import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export function SellerPublic() { const {slug:s}=useParams(); const db=useDb(); const sel=db.sellers.find(x=>x.slug===s); if(!sel)return <StatePage title="Seller not found" text="No such seller."/>;
  return <main className="wrap"><h1>{sel.studio}</h1><p>{sel.name} · {sel.location}</p><p>{sel.bio}</p><h2>Portfolio</h2><div className="grid">{db.projects.filter(p=>p.sellerId===sel.id&&p.status==='published').map(p=><Card key={p.id} p={p}/>)}</div></main>; }
export default SellerPublic;

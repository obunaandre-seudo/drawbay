import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export default function SellerAnalytics(){  const db=useDb(); 
  const mine=db.projects.filter(p=>p.sellerId===db.currentUser?.id); const ord=db.orders.filter(o=>o.sellerId===db.currentUser?.id).map(o=>({...o,project:pname(db,o.projectId),commission:o.commission ?? o.amount*db.settings.commissionRate,net:o.amount-(o.commission ?? o.amount*db.settings.commissionRate)-o.amount*db.settings.processingRate}));
 const k:string='analytics';
 return (<div><h1>Analytics</h1><Table search={false} rows={mine.map(p=>({title:p.title,views:p.popularity*12,saves:p.popularity,sales:db.orders.filter(o=>o.projectId===p.id).length}))} cols={[['title','Project'],['views','Views'],['saves','Saves'],['sales','Sales']]}/></div>);
}

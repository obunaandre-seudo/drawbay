import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { money, Skeleton } from '../../ui';
import * as api from '../../services/api';
import { Stat } from '../../components/common';

export default function SellerDashboard(){
  const db=api.useDb();const [earnings,setEarnings]=useState<any>(null);const [error,setError]=useState('');
  const mine=db.projects.filter(p=>p.sellerId===db.currentUser?.id);
  useEffect(()=>{api.getSellerEarnings().then(setEarnings).catch((e:any)=>setError(e.message))},[db.orders.length]);
  return <div><h1>Seller dashboard</h1>{error&&<p className="err" role="alert">{error}</p>}{earnings?<div className="stats"><Stat l="Gross sales" v={money(earnings.gross)}/><Stat l="Net earnings" v={money(earnings.net)}/><Stat l="Payouts in progress" v={money(earnings.pendingPayouts)}/><Stat l="In review" v={mine.filter(p=>p.status==='in_review').length}/></div>:<Skeleton/>}
    <div className="row"><Link className="btn" to="/seller/projects/new">Upload a project</Link><Link to="/seller/projects">Manage my projects</Link></div>
  </div>;
}

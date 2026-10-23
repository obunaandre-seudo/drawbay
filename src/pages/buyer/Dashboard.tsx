import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export default function BuyerDashboard(){  const db=useDb(); const {id}=useParams(); const mine=db.orders.filter(o=>o.buyerId===db.currentUser?.id).map(o=>({...o,project:pname(db,o.projectId)}));
 const k:string='dashboard';
 return (<div><h1>Buyer overview</h1><div className="stats"><Stat l="Purchases" v={mine.length}/><Stat l="Wishlist" v={db.wishlist.length}/><Stat l="Cart" v={db.cart.length}/></div><Link className="btn" to="/marketplace">Browse plans</Link></div>);
}

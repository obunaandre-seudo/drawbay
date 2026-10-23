import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export function Wishlist() { const db=useDb(); const l=db.projects.filter(p=>p.status==='published'&&db.wishlist.includes(p.id)); return <main className="wrap"><h1>Wishlist</h1>{l.length?<div className="grid">{l.map(p=><Card key={p.id} p={p}/>)}</div>:<Empty text="No saved projects yet." to="/marketplace" cta="Browse marketplace"/>}</main>; }
export default Wishlist;

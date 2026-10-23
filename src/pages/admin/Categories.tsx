import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

function Cats(){ const db=useDb(); const [n,setN]=useState(''); return <div><h1>Categories</h1><form className="row" onSubmit={e=>{e.preventDefault();if(n){api.setCategories([...db.categories,n]);setN('');toast('Category added')}}}><Field label="New category" value={n} onChange={(e:any)=>setN(e.target.value)}/><button className="btn">Add</button></form><ul className="list">{db.categories.map(c=><li key={c} className="row between">{c}<button className="link" onClick={()=>api.setCategories(db.categories.filter(x=>x!==c))}>Remove</button></li>)}</ul></div>; }
export default Cats;

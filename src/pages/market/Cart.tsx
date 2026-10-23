import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export function Cart() { const db=useDb(); const items=db.cart.flatMap(c=>{const p=db.projects.find(p=>p.id===c.id&&p.status==='published');return p?[{...c,p}]:[]}); const t=items.reduce((a,b)=>a+b.p.price*b.qty,0);
  return <main className="wrap"><h1>Cart</h1>{!items.length?<Empty text="Your cart is empty." to="/marketplace" cta="Browse marketplace"/>:<>{items.map(i=><div className="row between line" key={i.id}><span>{i.p.title}</span><span className="row"><button className="btn ghost sm" aria-label={`Decrease ${i.p.title} quantity`} onClick={()=>cartQty(i.id,-1)}>−</button>{i.qty}<button className="btn ghost sm" aria-label={`Increase ${i.p.title} quantity`} onClick={()=>cartQty(i.id,1)}>+</button></span><strong>{money(i.p.price*i.qty)}</strong><button className="btn ghost sm" onClick={()=>cartRemove(i.id)}>Remove</button></div>)}<h3>Total {money(t)}</h3><Link className="btn" to="/checkout">Checkout</Link></>}</main>; }
export default Cart;

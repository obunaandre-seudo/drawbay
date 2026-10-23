import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

function Settings(){ const db=useDb(); const [c,setC]=useState(db.settings.commissionRate*100); const [u,setU]=useState(db.settings.uploadFee); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const save=async(e:any)=>{e.preventDefault();setBusy(true);setError('');try{await api.saveSettings({commissionRate:c/100,uploadFee:u});toast('Marketplace settings saved')}catch(e:any){setError(e.message)}finally{setBusy(false)}};return <div><h1>Marketplace settings</h1><form className="narrow" onSubmit={save}><Field type="number" min={0} max={99} label="Commission rate (%)" value={c} onChange={(e:any)=>setC(+e.target.value)}/><Field type="number" min={0} label="Listing fee (NGN)" value={u} onChange={(e:any)=>setU(+e.target.value)}/>{error&&<p className="err" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Saving…':'Save settings'}</button></form></div>; }
export default Settings;

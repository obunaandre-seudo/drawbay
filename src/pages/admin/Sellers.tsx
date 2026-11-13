import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table } from '../../ui';
import * as api from '../../services/api';
import { useDb } from '../../services/api';
import type { SellerApplication } from '../../types';

export default function AdminSellers() {
  const db=useDb();
  const [applications,setApplications]=useState<SellerApplication[]>([]);
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  const load=async()=>{
    setLoading(true);
    try { setApplications(await api.getSellerApplications()); setError(''); }
    catch(e) { setError(e instanceof Error?e.message:'Could not load seller applications.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{void load();},[]);

  const decide=async(application:SellerApplication,approved:boolean)=>{
    setBusy(application.id);setError('');setMessage('');
    try {
      if(approved) await api.approveSellerApplication(application.id);
      else await api.rejectSellerApplication(application.id,reasons[application.id]||'');
      setMessage(approved?`${application.name} is approved to sell.`:`${application.name}'s application was declined.`);
      await Promise.all([load(),api.refreshDb()]);
    } catch(e) { setError(e instanceof Error?e.message:'Could not update this application.'); }
    finally { setBusy(''); }
  };
  const link=(p:string)=>(r:{id:string})=><Link to={`/admin/${p}/${r.id}`}>{r.id}</Link>;

  return <div className="admin-seller-page">
    <h1>Sellers</h1>
    <section className="admin-applications">
      <header><div><p className="seller-kicker">REVIEW QUEUE</p><h2>Seller applications</h2><p>New practices remain unable to upload until an administrator approves them.</p></div><span className="admin-application-count">{applications.length} pending</span></header>
      {error&&<p className="err" role="alert">{error}</p>}
      {message&&<p className="ok" role="status">{message}</p>}
      {loading?<p>Loading applications…</p>:applications.length===0?<p className="admin-no-applications">There are no seller applications waiting for review.</p>:
        <div className="admin-application-list">{applications.map(application=><article className="admin-application-card" key={application.id}>
          <div className="admin-application-title"><div><p className="seller-kicker">SUBMITTED {new Date(application.created_at).toLocaleDateString()}</p><h3>{application.name}</h3><span>{application.professional_title} · {application.studio}</span></div>
            <span className="admin-pending-pill">Pending approval</span></div>
          <dl className="admin-application-details">
            <div><dt>Email</dt><dd>{application.email}</dd></div><div><dt>Phone</dt><dd>{application.phone}</dd></div>
            <div><dt>Location</dt><dd>{application.city}, {application.country}</dd></div><div><dt>Experience</dt><dd>{application.years_experience} years</dd></div>
            <div><dt>Registration</dt><dd>{application.registration_body||'Not provided'}</dd></div><div><dt>License</dt><dd>{application.license_number||'Not provided'}</dd></div>
            <div className="admin-application-wide"><dt>Specializations</dt><dd>{application.specializations?.join(', ')||'Not provided'}</dd></div>
            <div className="admin-application-wide"><dt>Biography</dt><dd>{application.bio}</dd></div>
            <div><dt>Portfolio</dt><dd>{application.portfolio_website?<a href={application.portfolio_website} target="_blank" rel="noreferrer">Website ↗</a>:'Not provided'}</dd></div>
            <div><dt>LinkedIn</dt><dd>{application.linkedin_url?<a href={application.linkedin_url} target="_blank" rel="noreferrer">Profile ↗</a>:'Not provided'}</dd></div>
            <div className="admin-application-wide"><dt>Portfolio PDF</dt><dd>{application.portfolioUrl?<a href={application.portfolioUrl} target="_blank" rel="noreferrer">Open portfolio PDF ↗</a>:'Not attached'}</dd></div>
          </dl>
          <label className="admin-reject-reason">Reason if declining
            <textarea rows={2} value={reasons[application.id]||''} onChange={event=>setReasons(current=>({...current,[application.id]:event.target.value}))} placeholder="Share a brief reason with the applicant (required to decline)."/>
          </label>
          <div className="admin-application-actions"><button className="btn" type="button" disabled={busy===application.id} onClick={()=>void decide(application,true)}>{busy===application.id?'Saving…':'Approve seller'}</button>
            <button className="btn ghost" type="button" disabled={busy===application.id||(reasons[application.id]||'').trim().length<5} onClick={()=>void decide(application,false)}>Decline application</button></div>
        </article>)}</div>}
    </section>
    <section className="admin-seller-list"><h2>Seller accounts</h2><Table rows={db.sellers} cols={[
      ['id','ID',link('sellers')],['studio','Studio'],['location','Location'],
      ['applicationStatus','Application',r=>r.applicationStatus||'Approved'],['verified','Verified',r=>r.verified?'Yes':'No']
    ]}/></section>
  </div>;
}

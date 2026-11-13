import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../../ui';
import { submitSellerApplication, uploadSellerPortfolio } from '../../services/api';

const STORAGE_KEY = 'drawbay:seller-application';
const specialties = ['Residential', 'Interior design', 'Commercial', 'Landscape', 'Hospitality', 'Renovation'];
const steps = [
  { slug: 'personal', label: 'Personal', title: 'The person behind the practice', intro: 'Let’s start with how to reach you.' },
  { slug: 'professional', label: 'Professional', title: 'Your practice, in focus', intro: 'Tell us about your experience and the work you do.' },
  { slug: 'portfolio', label: 'Portfolio', title: 'Show us how you think', intro: 'A little context helps our review team understand your work.' },
  { slug: 'security', label: 'Security', title: 'Make this space yours', intro: 'Create a secure sign-in for your DrawBay account.' },
  { slug: 'review', label: 'Review', title: 'A final look, then it’s ours', intro: 'Review your application and confirm the professional declarations.' }
] as const;
type Step = typeof steps[number]['slug'];
type Credentials = {password:string;confirmPassword:string};
let routeCredentials:Credentials={password:'',confirmPassword:''};
type Draft = {
  firstName:string; lastName:string; email:string; phone:string; country:string; city:string;
  professionalTitle:string; studio:string; yearsExperience:string; registrationBody:string; licenseNumber:string;
  specializations:string[]; bio:string; portfolioWebsite:string; linkedinUrl:string;
  portfolioObjectKey:string; portfolioFilename:string;
  declarationAccuracy:boolean; declarationRights:boolean; agreedTerms:boolean;
};
const emptyDraft:Draft = {
  firstName:'',lastName:'',email:'',phone:'',country:'',city:'',professionalTitle:'',studio:'',
  yearsExperience:'',registrationBody:'',licenseNumber:'',specializations:[],bio:'',
  portfolioWebsite:'',linkedinUrl:'',portfolioObjectKey:'',portfolioFilename:'',
  declarationAccuracy:false,declarationRights:false,agreedTerms:false
};
function readDraft():Draft {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyDraft;
    const parsed:unknown=JSON.parse(saved);
    if (!parsed||typeof parsed!=='object') return emptyDraft;
    const draft={...emptyDraft,...parsed as Partial<Draft>};
    return {...draft,specializations:Array.isArray(draft.specializations)?draft.specializations.filter((value):value is string=>typeof value==='string'):[]};
  } catch { return emptyDraft; }
}
const isHttpsUrl = (value:string) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

function TextInput({label,value,onChange,type='text',required=false,placeholder,autoComplete,help}:{
  label:string;value:string;onChange:(value:string)=>void;type?:string;required?:boolean;
  placeholder?:string;autoComplete?:string;help?:string
}) {
  return <label className="seller-field"><span>{label}{required&&<b aria-hidden="true"> *</b>}</span>
    <input type={type} value={value} onChange={event=>onChange(event.target.value)} required={required}
      placeholder={placeholder} autoComplete={autoComplete}/>
    {help&&<small>{help}</small>}
  </label>;
}

export default function SellerSignUp() {
  const {step:stepParam} = useParams();
  const navigate = useNavigate();
  const step = (steps.some(item=>item.slug===stepParam) ? stepParam : 'personal') as Step;
  const index = steps.findIndex(item=>item.slug===step);
  const [draft,setDraft] = useState<Draft>(readDraft);
  const [credentials,setCredentials] = useState<Credentials>(routeCredentials);
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [formError,setFormError] = useState('');
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [savedError,setSavedError] = useState('');
  const [submitted,setSubmitted] = useState(false);
  const active = steps[index];

  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(draft)); setSavedError(''); }
    catch { setSavedError('Your browser could not save this draft. Keep this tab open while you complete the application.'); }
  },[draft]);

  useEffect(()=>{
    if (!stepParam || !steps.some(item=>item.slug===stepParam)) navigate('/seller/sign-up/personal',{replace:true});
  },[stepParam,navigate]);

  const update = (key:keyof Draft,value:Draft[keyof Draft]) => setDraft(current=>({...current,[key]:value}));
  const setText = (key:keyof Draft) => (value:string) => update(key,value);
  const setCredential = (key:keyof Credentials) => (value:string) => setCredentials(current=>{
    const next={...current,[key]:value};
    routeCredentials=next;
    return next;
  });
  const portfolioReady = Boolean(draft.portfolioObjectKey);
  const validate = (target:Step) => {
    const next:Record<string,string> = {};
    if (target==='personal') {
      if (!draft.firstName.trim()) next.firstName='Enter your first name.';
      if (!draft.lastName.trim()) next.lastName='Enter your last name.';
      if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) next.email='Enter a valid email address.';
      if (!draft.phone.trim()) next.phone='Enter your phone number.';
      if (!draft.country.trim()) next.country='Enter your country.';
      if (!draft.city.trim()) next.city='Enter your city.';
    }
    if (target==='professional') {
      if (!draft.professionalTitle.trim()) next.professionalTitle='Enter your professional title.';
      if (!draft.studio.trim()) next.studio='Enter your company or studio name.';
      if (!draft.yearsExperience || !Number.isInteger(Number(draft.yearsExperience)) || Number(draft.yearsExperience)<0 || Number(draft.yearsExperience)>80) next.yearsExperience='Enter a number from 0 to 80.';
      if (!draft.specializations.length) next.specializations='Choose at least one specialization.';
    }
    if (target==='portfolio') {
      if (draft.bio.trim().length<80) next.bio='Write at least 80 characters about your practice.';
      if (!isHttpsUrl(draft.portfolioWebsite)) next.portfolioWebsite='Use a valid HTTPS address.';
      if (!isHttpsUrl(draft.linkedinUrl)) next.linkedinUrl='Use a valid HTTPS address.';
    }
    if (target==='security') {
      if (credentials.password.length<12) next.password='Use at least 12 characters.';
      if (credentials.password!==credentials.confirmPassword) next.confirmPassword='Passwords do not match.';
    }
    if (target==='review') {
      if (!draft.declarationAccuracy) next.declarationAccuracy='Please confirm this declaration.';
      if (!draft.declarationRights) next.declarationRights='Please confirm this declaration.';
      if (!draft.agreedTerms) next.agreedTerms='Please accept the terms and conditions.';
    }
    setErrors(next);
    return Object.keys(next).length===0;
  };
  const move = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!validate(step)) return;
    navigate(`/seller/sign-up/${steps[index+1].slug}`);
  };
  const upload = async(event:ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];
    if (!file) return;
    setFormError('');
    if (file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf')||file.size>10*1024*1024) {
      setFormError('Choose a PDF file no larger than 10 MB.');
      event.target.value='';
      return;
    }
    setUploading(true);
    try {
      const uploaded=await uploadSellerPortfolio(file);
      setDraft(current=>({...current,portfolioObjectKey:uploaded.key,portfolioFilename:uploaded.name}));
    } catch(error) {
      setFormError(error instanceof Error?error.message:'Could not upload your portfolio. Please try again.');
    } finally { setUploading(false); }
  };
  const submit = async(event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!validate('review')) return;
    for (const requiredStep of steps.slice(0,4)) {
      if (!validate(requiredStep.slug)) {
        navigate(`/seller/sign-up/${requiredStep.slug}`);
        return;
      }
    }
    setBusy(true);
    try {
      await submitSellerApplication({...draft,...credentials,yearsExperience:Number(draft.yearsExperience)});
      routeCredentials={password:'',confirmPassword:''};
      setCredentials(routeCredentials);
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      setFormError('');
      setSavedError('');
    } catch(error) {
      setFormError(error instanceof Error?error.message:'We could not submit your application. Please try again.');
    } finally { setBusy(false); }
  };
  const toggleSpecialty = (value:string) => update('specializations',draft.specializations.includes(value)
    ? draft.specializations.filter(item=>item!==value) : [...draft.specializations,value]);
  const fieldError = (key:string) => errors[key]&&<small className="seller-error" role="alert">{errors[key]}</small>;
  const reviewRow = (label:string,value:string|number|undefined) => <div className="seller-review-row" key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>;

  if (submitted) return <main className="seller-apply seller-apply-success">
    <div className="seller-apply-top"><Link to="/" aria-label="DrawBay home"><Logo/></Link><Link to="/seller/sign-in">Already have an account? Sign in</Link></div>
    <section className="seller-success-card" role="status"><span className="seller-success-icon">✓</span>
      <p className="seller-kicker">APPLICATION RECEIVED</p><h1>Your next chapter starts here.</h1>
      <p>Thank you for applying to join DrawBay. Our team will review your practice and portfolio. You’ll receive an update in your DrawBay account when a decision is made.</p>
      <div className="seller-status-note"><b>Under review</b><span>Your seller account stays safely on hold until our team approves it.</span></div>
      <Link className="seller-secondary-link" to="/">Return to DrawBay <span aria-hidden="true">↗</span></Link>
    </section>
  </main>;

  return <main className="seller-apply">
    <header className="seller-apply-top"><Link to="/" aria-label="DrawBay home"><Logo/></Link>
      <span className="seller-top-note"><span className="seller-top-prompt">SELL WITH DRAWBAY <i/></span><Link to="/seller/sign-in"><span className="seller-desktop-label">Already a member? Sign in</span><span className="seller-mobile-label">Sign in</span></Link></span>
    </header>
    <div className="seller-apply-shell">
      <aside className="seller-apply-aside">
        <div className="seller-aside-art" aria-hidden="true"><div className="seller-art-orbit"/><div className="seller-art-building"><i/><i/><i/><i/><b/></div><span className="seller-art-label">FORM / FUNCTION / FUTURE</span></div>
        <div className="seller-aside-copy"><p className="seller-kicker">A PLACE FOR YOUR WORK</p><h1>Make room<br/>for <em>what’s next.</em></h1>
          <p>Bring your considered designs to the people ready to build them. Start with a simple introduction.</p>
        </div>
        <div className="seller-aside-footer"><span>DRAWBAY · PROFESSIONAL NETWORK</span><span>EST. FOR MAKERS</span></div>
      </aside>
      <section className="seller-apply-main">
        <div className="seller-form-header"><div><p className="seller-kicker">SELLER APPLICATION <span>·</span> 2026</p>
          <h2>{active.title}</h2><p>{active.intro}</p></div>
          <div className="seller-step-count"><b>0{index+1}</b><span>/ 05</span></div>
        </div>
        <div className="seller-progress" aria-label={`Step ${index+1} of 5`}>
          <div className="seller-progress-line"><span style={{width:`${(index+1)*20}%`}}/></div>
          <div className="seller-step-labels">{steps.map((item,itemIndex)=><button type="button" key={item.slug}
            className={itemIndex===index?'active':itemIndex<index?'complete':''}
            onClick={()=>itemIndex<index&&navigate(`/seller/sign-up/${item.slug}`)}
            aria-current={itemIndex===index?'step':undefined} aria-label={`Step ${itemIndex+1}: ${item.label}`}>
            <i>{itemIndex<index?'✓':`0${itemIndex+1}`}</i><span>{item.label}</span>
          </button>)}</div>
        </div>
        {savedError&&<p className="seller-storage-note" role="status">{savedError}</p>}
        {formError&&<p className="seller-form-error" role="alert">{formError}</p>}
        <form className="seller-form" onSubmit={step==='review'?submit:move} noValidate>
          {step==='personal'&&<div className="seller-form-grid">
            <TextInput label="First name" value={draft.firstName} onChange={setText('firstName')} required autoComplete="given-name"/>{fieldError('firstName')}
            <TextInput label="Last name" value={draft.lastName} onChange={setText('lastName')} required autoComplete="family-name"/>{fieldError('lastName')}
            <TextInput label="Email address" type="email" value={draft.email} onChange={setText('email')} required autoComplete="email" placeholder="you@studio.com"/>{fieldError('email')}
            <TextInput label="Phone number" type="tel" value={draft.phone} onChange={setText('phone')} required autoComplete="tel" placeholder="+1 555 000 0000"/>{fieldError('phone')}
            <TextInput label="Country" value={draft.country} onChange={setText('country')} required autoComplete="country-name"/>{fieldError('country')}
            <TextInput label="City" value={draft.city} onChange={setText('city')} required autoComplete="address-level2"/>{fieldError('city')}
          </div>}
          {step==='professional'&&<div className="seller-form-grid">
            <TextInput label="Professional title" value={draft.professionalTitle} onChange={setText('professionalTitle')} required placeholder="e.g. Architect, Interior designer"/>{fieldError('professionalTitle')}
            <TextInput label="Company / studio name" value={draft.studio} onChange={setText('studio')} required placeholder="The name on your work"/>{fieldError('studio')}
            <TextInput label="Years of experience" type="number" value={draft.yearsExperience} onChange={setText('yearsExperience')} required placeholder="e.g. 8"/>{fieldError('yearsExperience')}
            <TextInput label="Professional registration body (if applicable)" value={draft.registrationBody} onChange={setText('registrationBody')} placeholder="e.g. ARCON, RIBA"/>
            <TextInput label="License / registration number (if applicable)" value={draft.licenseNumber} onChange={setText('licenseNumber')} placeholder="Your professional number"/>
            <fieldset className="seller-specialties"><legend>Areas of specialization <b>*</b></legend><p>Select all that reflect your practice.</p>
              <div>{specialties.map(item=><label key={item} className={draft.specializations.includes(item)?'selected':''}>
                <input type="checkbox" checked={draft.specializations.includes(item)} onChange={()=>toggleSpecialty(item)}/><span>{item}</span>
              </label>)}</div>{fieldError('specializations')}
            </fieldset>
          </div>}
          {step==='portfolio'&&<div className="seller-form-grid seller-portfolio-grid">
            <label className="seller-field seller-bio-field"><span>Professional biography <b>*</b></span>
              <textarea rows={5} value={draft.bio} onChange={event=>setText('bio')(event.target.value)} placeholder="Tell us what you care about, the projects you take on, and how you approach your work."/>
              <small>At least 80 characters. {draft.bio.length}/5,000</small>{fieldError('bio')}
            </label>
            <TextInput label="Portfolio website (optional)" type="url" value={draft.portfolioWebsite} onChange={setText('portfolioWebsite')} placeholder="https://yourstudio.com"/>{fieldError('portfolioWebsite')}
            <TextInput label="LinkedIn profile (optional)" type="url" value={draft.linkedinUrl} onChange={setText('linkedinUrl')} placeholder="https://linkedin.com/in/you"/>{fieldError('linkedinUrl')}
            <div className="seller-field seller-file-field"><span>Portfolio PDF <small>Optional · PDF up to 10 MB</small></span>
              <label className="seller-file-drop"><input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={uploading}/>
                <i aria-hidden="true">↑</i><b>{uploading?'Uploading securely…':portfolioReady?draft.portfolioFilename:'Choose a portfolio PDF'}</b>
                <span>{uploading?'Keep this page open while it uploads.':portfolioReady?'Uploaded and ready to submit':'Drop a file here or browse your device'}</span>
              </label>
            </div>
          </div>}
          {step==='security'&&<div className="seller-security">
            <div className="seller-security-mark" aria-hidden="true">✳</div>
            <TextInput label="Password" type="password" value={credentials.password} onChange={setCredential('password')} required autoComplete="new-password" help="Use at least 12 characters. Your password is never saved in your draft."/>
            {fieldError('password')}
            <TextInput label="Confirm password" type="password" value={credentials.confirmPassword} onChange={setCredential('confirmPassword')} required autoComplete="new-password"/>
            {fieldError('confirmPassword')}
            <p className="seller-privacy-note"><span>◇</span> Your password is sent over an encrypted connection and is never stored in your browser draft.</p>
          </div>}
          {step==='review'&&<div className="seller-review">
            <div className="seller-review-section"><div className="seller-review-heading"><h3>Personal information</h3><button type="button" onClick={()=>navigate('/seller/sign-up/personal')}>Edit</button></div><dl>
              {reviewRow('Name',`${draft.firstName} ${draft.lastName}`)}{reviewRow('Email',draft.email)}{reviewRow('Phone',draft.phone)}{reviewRow('Location',[draft.city,draft.country].filter(Boolean).join(', '))}
            </dl></div>
            <div className="seller-review-section"><div className="seller-review-heading"><h3>Professional profile</h3><button type="button" onClick={()=>navigate('/seller/sign-up/professional')}>Edit</button></div><dl>
              {reviewRow('Title',draft.professionalTitle)}{reviewRow('Practice',draft.studio)}{reviewRow('Experience',draft.yearsExperience?`${draft.yearsExperience} years`:undefined)}
              {reviewRow('Registration',draft.registrationBody)}{reviewRow('License number',draft.licenseNumber)}{reviewRow('Specialization',draft.specializations.join(', '))}
            </dl></div>
            <div className="seller-review-section"><div className="seller-review-heading"><h3>Portfolio & experience</h3><button type="button" onClick={()=>navigate('/seller/sign-up/portfolio')}>Edit</button></div><dl>
              {reviewRow('Biography',draft.bio)}{reviewRow('Website',draft.portfolioWebsite)}{reviewRow('LinkedIn',draft.linkedinUrl)}{reviewRow('Portfolio PDF',draft.portfolioFilename)}
            </dl></div>
            <div className="seller-declarations"><p className="seller-kicker">PROFESSIONAL DECLARATIONS</p>
              <label><input type="checkbox" checked={draft.declarationAccuracy} onChange={event=>update('declarationAccuracy',event.target.checked)}/><span>I confirm that the information and professional credentials in this application are accurate and current.</span></label>{fieldError('declarationAccuracy')}
              <label><input type="checkbox" checked={draft.declarationRights} onChange={event=>update('declarationRights',event.target.checked)}/><span>I confirm I own, or have permission to share, the portfolio work and designs submitted.</span></label>{fieldError('declarationRights')}
              <label><input type="checkbox" checked={draft.agreedTerms} onChange={event=>update('agreedTerms',event.target.checked)}/><span>I have read and agree to the <Link to="/seller-agreement" target="_blank" rel="noreferrer">Seller Agreement</Link> and <Link to="/terms" target="_blank" rel="noreferrer">Terms & Conditions</Link>.</span></label>{fieldError('agreedTerms')}
            </div>
            <div className="seller-review-note"><b>What happens next?</b><span>Our team will review your application. Seller upload access stays disabled until approval.</span></div>
          </div>}
          <div className="seller-form-actions">
            {index>0?<button type="button" className="seller-back" onClick={()=>navigate(`/seller/sign-up/${steps[index-1].slug}`)}><span aria-hidden="true">←</span> Previous</button>:<Link className="seller-back" to="/get-started">← Back to options</Link>}
            <span className="seller-save-copy">Your progress is saved automatically</span>
            {step==='review'
              ? <button className="seller-continue" type="submit" disabled={busy||uploading}>{busy?'Submitting…':'Submit application'} <span aria-hidden="true">↗</span></button>
              : <button className="seller-continue" type="submit" disabled={uploading}>Continue <span aria-hidden="true">→</span></button>}
          </div>
        </form>
        <footer className="seller-form-footer"><span>PRIVATE BY DESIGN <i/> REVIEWED BY PEOPLE</span><Link to="/privacy">Privacy</Link></footer>
      </section>
    </div>
  </main>;
}

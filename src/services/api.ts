import { useEffect, useSyncExternalStore } from 'react';
import type { Db, Project, Role } from '../types';

const apiBase = (import.meta as any).env?.VITE_API_BASE || '/api';
const empty: Db = {
  projects:[],sellers:[],buyers:[],orders:[],payouts:[],wishlist:[],cart:[],session:null,
  settings:{commissionRate:0.15,processingRate:0.015,uploadFee:10000},audit:[],
  categories:['Residential houses','Duplexes & luxury homes','Apartments','Commercial buildings','Office buildings','Interior designs','Renovation projects','Landscape designs','Other projects'],
  support:[],notifications:[]
};
let db: Db = empty;
let version = 0;
let loading = false;
let initialized = false;
export let stateReady = false;
const subscribers = new Set<() => void>();
const notify = () => { version++; subscribers.forEach(fn => fn()); };
const subscribe = (fn: () => void) => { subscribers.add(fn); return () => subscribers.delete(fn); };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type','application/json');
  const response = await fetch(`${apiBase}${path}`, { ...init, headers, credentials:'same-origin' });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error || `Request failed (${response.status})`,response.status,body?.code);
  return body as T;
}

async function updateState(state?: Db) {
  if (state) db = state;
  else {
    try { db = await request<Db>('/app/state'); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      db = await request<Db>('/public/state');
      const guestCart = sessionStorage.getItem('drawbay:guest-cart');
      if (guestCart) { try { db.cart = JSON.parse(guestCart); } catch { sessionStorage.removeItem('drawbay:guest-cart'); } }
      const guestWishlist = sessionStorage.getItem('drawbay:guest-wishlist');
      if (guestWishlist) { try { db.wishlist = JSON.parse(guestWishlist); } catch { sessionStorage.removeItem('drawbay:guest-wishlist'); } }
    }
  }
  initialized = true;
  stateReady = true;
  notify();
  return db;
}

export async function refreshDb() {
  if (loading) return;
  loading = true;
  try { await updateState(); }
  catch (error) { console.error('Could not load marketplace state',error); }
  finally { loading = false; }
}

export const useDb = (): Db => {
  useSyncExternalStore(subscribe,() => version);
  useEffect(() => { if (!initialized && !loading) void refreshDb(); },[]);
  return db;
};

const refreshAfter = async <T,>(promise: Promise<T>): Promise<T> => { const value = await promise; await updateState(); return value; };
export const getProjects = async () => request<Project[]>('/projects');
export const getProjectBySlug = async (slug?: string) => {
  if (!slug) return undefined;
  try { return await request<Project>(`/projects/${encodeURIComponent(slug)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return undefined; throw error; }
};
export const searchProjects = async (q: string) => request<Project[]>(`/projects?q=${encodeURIComponent(q)}`);

export async function signIn(role: Role,email: string,password: string) {
  const guestCart = sessionStorage.getItem('drawbay:guest-cart');
  const guestWishlist = sessionStorage.getItem('drawbay:guest-wishlist');
  const result = await request<{user:{role:Role}}>('/auth/login',{method:'POST',body:JSON.stringify({role,email,password})});
  if (result.user.role === 'buyer') {
    if (guestCart) {
      try { const valid=JSON.parse(guestCart).filter((x:any)=>db.projects.some(p=>p.id===x.id&&p.status==='published')); await request('/cart',{method:'PUT',body:JSON.stringify({items:valid})}); }
      catch(error){ console.warn('Some guest cart items were unavailable after sign-in',error); }
    }
    if (guestWishlist) for (const id of JSON.parse(guestWishlist)) try { await request(`/wishlist/${encodeURIComponent(id)}/toggle`,{method:'POST'}); } catch { /* unavailable saved items are dropped */ }
  }
  sessionStorage.removeItem('drawbay:guest-cart'); sessionStorage.removeItem('drawbay:guest-wishlist');
  await updateState();
  return result.user;
}
export const signUp = (role: Exclude<Role,'admin'>, name: string,email: string,password: string) => request('/auth/register',{method:'POST',body:JSON.stringify({role,name,email,password})});
export const verifyEmail = (token: string) => request('/auth/verify-email',{method:'POST',body:JSON.stringify({token})});
export const resendVerification = (email: string) => request('/auth/resend-verification',{method:'POST',body:JSON.stringify({email})});
export const requestPasswordReset = (email: string) => request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});
export const resetPassword = (token: string,password: string) => request('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});
export const updateProfile = async (profile: {name:string;studio?:string;bio?:string;location?:string}) => refreshAfter(request('/profile',{method:'PATCH',body:JSON.stringify(profile)}));
export const changePassword = (currentPassword:string,password:string) => request('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword,password})});
export const createSupportTicket = async (subject:string,message:string) => refreshAfter(request('/support',{method:'POST',body:JSON.stringify({subject,message})}));
export const sendContactMessage = (name:string,email:string,message:string) => request('/contact',{method:'POST',body:JSON.stringify({name,email,message})});
export const getOrderDownloads = (id:string) => request<Array<{name:string;url:string}>>(`/orders/${encodeURIComponent(id)}/downloads`);
export async function setSession(role: Role | null) {
  if (role) return;
  await request('/auth/logout',{method:'POST'});
  db = { ...db,session:null,cart:[],wishlist:[],orders:[],payouts:[] };
  sessionStorage.removeItem('drawbay:guest-cart');
  await updateState();
}

export async function createProjectDraft(project: Partial<Project>) {
  const created = await request<Project>('/seller/projects',{method:'POST',body:JSON.stringify(project)});
  await updateState();
  return created;
}
export async function updateProject(id: string,patch: Partial<Project>) {
  const area=db.session==='admin'?'admin':'seller';
  const path=area==='seller'&&patch.status==='archived'?`/seller/projects/${encodeURIComponent(id)}/archive`:`/${area}/projects/${encodeURIComponent(id)}`;
  const updated = await request<Project>(path,{method:area==='seller'&&patch.status==='archived'?'POST':'PATCH',body:JSON.stringify(patch)});
  await updateState();
  return updated;
}
export const startUploadFeePayment = (id: string) => request<{authorizationUrl:string;reference:string}>(`/seller/projects/${encodeURIComponent(id)}/upload-fee/checkout`,{method:'POST',body:'{}'});
export async function submitProjectForReview(id: string) {
  try { await request(`/seller/projects/${encodeURIComponent(id)}/submit`,{method:'POST',body:'{}'}); await updateState(); return true; }
  catch (error) { if (error instanceof ApiError && (error.status === 409 || error.status === 404)) return false; throw error; }
}
export const approveProject = async (id: string) => refreshAfter(request(`/admin/projects/${encodeURIComponent(id)}/approve`,{method:'POST',body:'{}'}));
export const rejectProject = async (id: string,reason: string,changes = false) => refreshAfter(request(`/admin/projects/${encodeURIComponent(id)}/reject`,{method:'POST',body:JSON.stringify({reason,changesRequested:changes})}));

export const getOrders = () => request('/orders');
export const getUploadFees = () => request('/admin/upload-fees');
export const getSellerEarnings = () => request('/seller/earnings');
export const getAdminDashboardStats = () => request('/admin/stats');
export const getBanks = () => request<Array<{name:string;code:string}>>('/seller/banks');
export const getPayoutAccount = () => request<{bank?:string;accountName?:string;last4?:string}>('/seller/payout-account');
export const savePayoutAccount = (accountNumber:string,bankCode:string) => refreshAfter(request('/seller/payout-account',{method:'PUT',body:JSON.stringify({accountNumber,bankCode})}));
export const createPayout = async (sellerId:string,amount:number) => refreshAfter(request('/admin/payouts',{method:'POST',body:JSON.stringify({sellerId,amount})}));
export const sendPayout = async (id:string) => refreshAfter(request(`/admin/payouts/${encodeURIComponent(id)}/send`,{method:'POST',body:'{}'}));
export const refundOrder = (id:string,reason:string) => request(`/admin/orders/${encodeURIComponent(id)}/refund`,{method:'POST',body:JSON.stringify({reason})});
export async function startCheckout(items: Array<{id?:string;projectId?:string;qty:number}> = db.cart) {
  if (db.session !== 'buyer') { window.location.assign('/buyer/sign-in?returnTo=%2Fcheckout'); return; }
  const result = await request<{authorizationUrl:string;reference:string}>('/payments/checkout',{method:'POST',body:JSON.stringify({items})});
  window.location.assign(result.authorizationUrl);
}

export const verifyPayment = (reference: string) => request<{status:string;purpose:'checkout'|'upload_fee';orders:any[]}>(`/payments/verify/${encodeURIComponent(reference)}`);

export async function toggleWishlist(id: string) {
  if (db.session !== 'buyer') {
    const items = new Set(db.wishlist); items.has(id) ? items.delete(id) : items.add(id);
    db = { ...db,wishlist:[...items] }; sessionStorage.setItem('drawbay:guest-wishlist',JSON.stringify(db.wishlist)); notify(); return;
  }
  const result = await request<{wishlist:string[]}>(`/wishlist/${encodeURIComponent(id)}/toggle`,{method:'POST'});
  db = { ...db,wishlist:result.wishlist }; notify();
}
async function saveCart(items: Db['cart']) {
  db = { ...db,cart:items }; notify();
  if (db.session === 'buyer') await request('/cart',{method:'PUT',body:JSON.stringify({items})});
  else sessionStorage.setItem('drawbay:guest-cart',JSON.stringify(items));
}
export const cartAdd = (id: string) => { if (!db.cart.some(c => c.id === id)) void saveCart([...db.cart,{id,qty:1}]); };
export const cartQty = (id: string,delta: number) => { const cart = db.cart.map(c => c.id === id ? {...c,qty:c.qty+delta} : c).filter(c => c.qty > 0); void saveCart(cart); };
export const cartRemove = (id: string) => void saveCart(db.cart.filter(c => c.id !== id));
export const saveSettings = async (settings: Partial<Db['settings']>) => refreshAfter(request('/admin/settings',{method:'PUT',body:JSON.stringify({...db.settings,...settings})}));
export const setCategories = async (categories: string[]) => refreshAfter(request('/admin/categories',{method:'PUT',body:JSON.stringify({categories})}));
export async function uploadProjectFile(projectId: string,file: File,kind: 'preview'|'deliverable') {
  const info = await request<{url:string;key:string;headers:Record<string,string>}>(`/seller/projects/${encodeURIComponent(projectId)}/files/presign`,{method:'POST',body:JSON.stringify({name:file.name,contentType:file.type || 'application/octet-stream',size:file.size,kind})});
  const upload = await fetch(info.url,{method:'PUT',headers:info.headers,body:file});
  if (!upload.ok) throw new ApiError('File upload failed',upload.status);
  return request<{id:string;display_name:string;previewUrl?:string}>(`/seller/projects/${encodeURIComponent(projectId)}/files/complete`,{method:'POST',body:JSON.stringify({key:info.key,name:file.name,kind})});
}

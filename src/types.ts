export type Role = 'buyer' | 'seller' | 'admin';
export type ProjectStatus = 'draft'|'awaiting_fee'|'payment_pending'|'in_review'|'changes_requested'|'published'|'rejected'|'archived';
export interface Project { id:string; slug:string; title:string; desc:string; category:string; style:string; price:number; bedrooms:number; bathrooms:number; floors:number; sellerId:string; img:string; status:ProjectStatus; featured:boolean; popularity:number; date:string; files:string[]; feedback?:string }
export interface Seller { id:string; slug:string; name:string; studio:string; bio:string; location:string; email:string; verified:boolean; applicationStatus?:'pending'|'approved'|'rejected' }
export interface SellerApplication { id:string;name:string;email:string;created_at:string;studio:string;bio:string;location:string;phone:string;country:string;city:string;professional_title:string;years_experience:number;registration_body:string;license_number:string;specializations:string[];portfolio_website:string;linkedin_url:string;portfolioUrl:string|null }
export interface Buyer { id:string; name:string; email:string; joined:string }
export interface Order { id:string; buyerId:string; projectId:string; sellerId:string; amount:number; commission?:number; date:string; status:'paid'|'refunded'|'disputed' }
export interface Payout { id:string; sellerId:string; amount:number; date:string; status:'pending'|'completed' }
export interface Settings { commissionRate:number; processingRate:number; uploadFee:number }
export interface Db { projects:Project[]; sellers:Seller[]; buyers:Buyer[]; orders:Order[]; payouts:Payout[]; wishlist:string[]; cart:{id:string;qty:number}[]; session:Role|null; currentUser?:{id:string;name:string;email:string;role:Role;verified:boolean}; settings:Settings; audit:{when:string;who:string;what:string}[]; categories:string[]; support:{id:string;from:string;subject:string;status:string}[]; notifications:string[] }

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout, DashLayout } from './layouts';
const PublicWelcome = lazy(() => import('./pages/public/Welcome'));
const PublicGetStarted = lazy(() => import('./pages/public/GetStarted'));
const PublicAbout = lazy(() => import('./pages/public/About'));
const PublicContact = lazy(() => import('./pages/public/Contact'));
const PublicFaq = lazy(() => import('./pages/public/Faq'));
const PublicTerms = lazy(() => import('./pages/public/Terms'));
const PublicPrivacy = lazy(() => import('./pages/public/Privacy'));
const PublicRefundPolicy = lazy(() => import('./pages/public/RefundPolicy'));
const PublicSellerAgreement = lazy(() => import('./pages/public/SellerAgreement'));
const PublicUnauthorized = lazy(() => import('./pages/public/Unauthorized'));
const PublicAccessDenied = lazy(() => import('./pages/public/AccessDenied'));
const PublicSessionExpired = lazy(() => import('./pages/public/SessionExpired'));
const PublicAppError = lazy(() => import('./pages/public/AppError'));
const PublicNetworkError = lazy(() => import('./pages/public/NetworkError'));
const AuthBuyerSignUp = lazy(() => import('./pages/auth/BuyerSignUp'));
const AuthBuyerSignIn = lazy(() => import('./pages/auth/BuyerSignIn'));
const AuthBuyerForgotPassword = lazy(() => import('./pages/auth/BuyerForgotPassword'));
const AuthBuyerResetPassword = lazy(() => import('./pages/auth/BuyerResetPassword'));
const AuthBuyerVerifyEmail = lazy(() => import('./pages/auth/BuyerVerifyEmail'));
const AuthSellerSignUp = lazy(() => import('./pages/auth/SellerSignUp'));
const AuthSellerSignIn = lazy(() => import('./pages/auth/SellerSignIn'));
const AuthSellerForgotPassword = lazy(() => import('./pages/auth/SellerForgotPassword'));
const AuthSellerResetPassword = lazy(() => import('./pages/auth/SellerResetPassword'));
const AuthSellerVerifyEmail = lazy(() => import('./pages/auth/SellerVerifyEmail'));
const AuthAdminSignIn = lazy(() => import('./pages/auth/AdminSignIn'));
const MarketMarketplace = lazy(() => import('./pages/market/Marketplace'));
const MarketAllProjects = lazy(() => import('./pages/market/AllProjects'));
const MarketProjectDetail = lazy(() => import('./pages/market/ProjectDetail'));
const MarketCategoryPage = lazy(() => import('./pages/market/CategoryPage'));
const MarketSearchResults = lazy(() => import('./pages/market/SearchResults'));
const MarketSellerProfilePublic = lazy(() => import('./pages/market/SellerProfilePublic'));
const MarketWishlist = lazy(() => import('./pages/market/Wishlist'));
const MarketCart = lazy(() => import('./pages/market/Cart'));
const MarketCheckout = lazy(() => import('./pages/market/Checkout'));
const MarketCheckoutSuccess = lazy(() => import('./pages/market/CheckoutSuccess'));
const MarketCheckoutFailed = lazy(() => import('./pages/market/CheckoutFailed'));
const PublicNotFound = lazy(() => import('./pages/public/NotFound'));
const BuyerDashboard = lazy(() => import('./pages/buyer/Dashboard'));
const BuyerPurchases = lazy(() => import('./pages/buyer/Purchases'));
const BuyerOrderDetail = lazy(() => import('./pages/buyer/OrderDetail'));
const BuyerDownloads = lazy(() => import('./pages/buyer/Downloads'));
const BuyerProfile = lazy(() => import('./pages/buyer/Profile'));
const BuyerNotifications = lazy(() => import('./pages/buyer/Notifications'));
const BuyerSupport = lazy(() => import('./pages/buyer/Support'));
const SellerOnboarding = lazy(() => import('./pages/seller/Onboarding'));
const SellerProfileSetup = lazy(() => import('./pages/seller/ProfileSetup'));
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));
const SellerProjects = lazy(() => import('./pages/seller/Projects'));
const SellerUploadProject = lazy(() => import('./pages/seller/UploadProject'));
const SellerProjectDetail = lazy(() => import('./pages/seller/ProjectDetail'));
const SellerEditProject = lazy(() => import('./pages/seller/EditProject'));
const SellerUploadPayment = lazy(() => import('./pages/seller/UploadPayment'));
const SellerUploadPaymentSuccess = lazy(() => import('./pages/seller/UploadPaymentSuccess'));
const SellerUploadPaymentFailed = lazy(() => import('./pages/seller/UploadPaymentFailed'));
const SellerUploadPaymentPending = lazy(() => import('./pages/seller/UploadPaymentPending'));
const SellerSales = lazy(() => import('./pages/seller/Sales'));
const SellerOrders = lazy(() => import('./pages/seller/Orders'));
const SellerEarnings = lazy(() => import('./pages/seller/Earnings'));
const SellerPayouts = lazy(() => import('./pages/seller/Payouts'));
const SellerAnalytics = lazy(() => import('./pages/seller/Analytics'));
const SellerProfile = lazy(() => import('./pages/seller/Profile'));
const SellerSettings = lazy(() => import('./pages/seller/Settings'));
const SellerNotifications = lazy(() => import('./pages/seller/Notifications'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminReviewQueue = lazy(() => import('./pages/admin/ReviewQueue'));
const AdminReviewDetail = lazy(() => import('./pages/admin/ReviewDetail'));
const AdminProjects = lazy(() => import('./pages/admin/Projects'));
const AdminSellers = lazy(() => import('./pages/admin/Sellers'));
const AdminSellerDetail = lazy(() => import('./pages/admin/SellerDetail'));
const AdminBuyers = lazy(() => import('./pages/admin/Buyers'));
const AdminBuyerDetail = lazy(() => import('./pages/admin/BuyerDetail'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const AdminUploadFees = lazy(() => import('./pages/admin/UploadFees'));
const AdminTransactions = lazy(() => import('./pages/admin/Transactions'));
const AdminCommissions = lazy(() => import('./pages/admin/Commissions'));
const AdminPayouts = lazy(() => import('./pages/admin/Payouts'));
const AdminRefunds = lazy(() => import('./pages/admin/Refunds'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminContent = lazy(() => import('./pages/admin/Content'));
const AdminSupport = lazy(() => import('./pages/admin/Support'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLog'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));

// One file per page lives in src/pages/<area>/. Routes are declared here.
function PageLoader() { return <main className="page-loader" aria-busy="true" aria-label="Loading"><div className="loading-dots" aria-hidden="true"><span/><span/><span/></div></main>; }
export default function App() { return <BrowserRouter><Suspense fallback={<PageLoader/>}><Routes>
  <Route element={<PublicLayout/>}>
    <Route path="/" element={<PublicWelcome/>}/>
    <Route path="/get-started" element={<PublicGetStarted/>}/>
    <Route path="/about" element={<PublicAbout/>}/>
    <Route path="/contact" element={<PublicContact/>}/>
    <Route path="/faq" element={<PublicFaq/>}/>
    <Route path="/terms" element={<PublicTerms/>}/>
    <Route path="/privacy" element={<PublicPrivacy/>}/>
    <Route path="/refund-policy" element={<PublicRefundPolicy/>}/>
    <Route path="/seller-agreement" element={<PublicSellerAgreement/>}/>
    <Route path="/unauthorized" element={<PublicUnauthorized/>}/>
    <Route path="/access-denied" element={<PublicAccessDenied/>}/>
    <Route path="/session-expired" element={<PublicSessionExpired/>}/>
    <Route path="/error" element={<PublicAppError/>}/>
    <Route path="/network-error" element={<PublicNetworkError/>}/>
    <Route path="/buyer/sign-up" element={<AuthBuyerSignUp/>}/>
    <Route path="/buyer/sign-in" element={<AuthBuyerSignIn/>}/>
    <Route path="/buyer/forgot-password" element={<AuthBuyerForgotPassword/>}/>
    <Route path="/buyer/reset-password" element={<AuthBuyerResetPassword/>}/>
    <Route path="/buyer/verify-email" element={<AuthBuyerVerifyEmail/>}/>
    <Route path="/seller/sign-up" element={<AuthSellerSignUp/>}/>
    <Route path="/seller/sign-in" element={<AuthSellerSignIn/>}/>
    <Route path="/seller/forgot-password" element={<AuthSellerForgotPassword/>}/>
    <Route path="/seller/reset-password" element={<AuthSellerResetPassword/>}/>
    <Route path="/seller/verify-email" element={<AuthSellerVerifyEmail/>}/>
    <Route path="/admin/sign-in" element={<AuthAdminSignIn/>}/>
    <Route path="/marketplace" element={<MarketMarketplace/>}/>
    <Route path="/projects" element={<MarketAllProjects/>}/>
    <Route path="/projects/:slug" element={<MarketProjectDetail/>}/>
    <Route path="/categories/:slug" element={<MarketCategoryPage/>}/>
    <Route path="/search" element={<MarketSearchResults/>}/>
    <Route path="/sellers/:slug" element={<MarketSellerProfilePublic/>}/>
    <Route path="/wishlist" element={<MarketWishlist/>}/>
    <Route path="/cart" element={<MarketCart/>}/>
    <Route path="/checkout" element={<MarketCheckout/>}/>
    <Route path="/checkout/success" element={<MarketCheckoutSuccess/>}/>
    <Route path="/checkout/failed" element={<MarketCheckoutFailed/>}/>
    <Route path="*" element={<PublicNotFound/>}/>
  </Route>
  <Route path="/buyer" element={<DashLayout role="buyer"/>}>
    <Route path="dashboard" element={<BuyerDashboard/>}/>
    <Route path="purchases" element={<BuyerPurchases/>}/>
    <Route path="purchases/:id" element={<BuyerOrderDetail/>}/>
    <Route path="downloads" element={<BuyerDownloads/>}/>
    <Route path="profile" element={<BuyerProfile/>}/>
    <Route path="notifications" element={<BuyerNotifications/>}/>
    <Route path="support" element={<BuyerSupport/>}/>
  </Route>
  <Route path="/seller" element={<DashLayout role="seller"/>}>
    <Route path="onboarding" element={<SellerOnboarding/>}/>
    <Route path="profile/setup" element={<SellerProfileSetup/>}/>
    <Route path="dashboard" element={<SellerDashboard/>}/>
    <Route path="projects" element={<SellerProjects/>}/>
    <Route path="projects/new" element={<SellerUploadProject/>}/>
    <Route path="projects/:id" element={<SellerProjectDetail/>}/>
    <Route path="projects/:id/edit" element={<SellerEditProject/>}/>
    <Route path="upload-payment" element={<SellerUploadPayment/>}/>
    <Route path="upload-payment/success" element={<SellerUploadPaymentSuccess/>}/>
    <Route path="upload-payment/failed" element={<SellerUploadPaymentFailed/>}/>
    <Route path="upload-payment/pending" element={<SellerUploadPaymentPending/>}/>
    <Route path="sales" element={<SellerSales/>}/>
    <Route path="orders" element={<SellerOrders/>}/>
    <Route path="earnings" element={<SellerEarnings/>}/>
    <Route path="payouts" element={<SellerPayouts/>}/>
    <Route path="analytics" element={<SellerAnalytics/>}/>
    <Route path="profile" element={<SellerProfile/>}/>
    <Route path="settings" element={<SellerSettings/>}/>
    <Route path="notifications" element={<SellerNotifications/>}/>
  </Route>
  <Route path="/admin" element={<DashLayout role="admin"/>}>
    <Route path="dashboard" element={<AdminDashboard/>}/>
    <Route path="reviews" element={<AdminReviewQueue/>}/>
    <Route path="reviews/:id" element={<AdminReviewDetail/>}/>
    <Route path="projects" element={<AdminProjects/>}/>
    <Route path="sellers" element={<AdminSellers/>}/>
    <Route path="sellers/:id" element={<AdminSellerDetail/>}/>
    <Route path="buyers" element={<AdminBuyers/>}/>
    <Route path="buyers/:id" element={<AdminBuyerDetail/>}/>
    <Route path="orders" element={<AdminOrders/>}/>
    <Route path="orders/:id" element={<AdminOrderDetail/>}/>
    <Route path="upload-fees" element={<AdminUploadFees/>}/>
    <Route path="transactions" element={<AdminTransactions/>}/>
    <Route path="commissions" element={<AdminCommissions/>}/>
    <Route path="payouts" element={<AdminPayouts/>}/>
    <Route path="refunds" element={<AdminRefunds/>}/>
    <Route path="categories" element={<AdminCategories/>}/>
    <Route path="content" element={<AdminContent/>}/>
    <Route path="support" element={<AdminSupport/>}/>
    <Route path="settings" element={<AdminSettings/>}/>
    <Route path="audit-log" element={<AdminAuditLog/>}/>
    <Route path="profile" element={<AdminProfile/>}/>
    <Route path="notifications" element={<AdminNotifications/>}/>
  </Route>
</Routes></Suspense></BrowserRouter>; }

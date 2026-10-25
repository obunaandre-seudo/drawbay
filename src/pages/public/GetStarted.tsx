import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';
import { Stat, pname, Notifs, ProfileForm, Support } from '../../components/common';

export const GetStarted = () => <main className="wrap audience-page">
  <header className="audience-intro"><span className="audience-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h1>What brings you to Guaranteed Impressions?</h1><p>Find the right space for your plans, or share your work with people ready to build.</p></header>
  <div className="audience-grid">
    <article className="audience-card buyer-card">
      <div className="audience-image"><Img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85" alt="A home buyer holding keys in front of a new home"/><span className="audience-image-tag">FIND YOUR PLACE</span></div>
      <div className="audience-copy"><span className="audience-number">01 — FOR HOME SEEKERS</span><h2>I'm a buyer</h2><p>Discover thoughtful designs, compare the details, and find plans that feel like home.</p><Link className="btn audience-link" to="/buyer/sign-up">Explore as a buyer <span aria-hidden="true">↗</span></Link></div>
    </article>
    <article className="audience-card seller-card">
      <div className="audience-image"><Img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85" alt="Designers sharing ideas around a studio table"/><span className="audience-image-tag">SHARE YOUR WORK</span></div>
      <div className="audience-copy"><span className="audience-number">02 — FOR DESIGNERS</span><h2>I'm a seller</h2><p>Showcase your architectural work and connect your designs with their next owner.</p><Link className="btn audience-link" to="/seller/sign-up">Start selling <span aria-hidden="true">↗</span></Link></div>
    </article>
  </div>
  <p className="audience-footnote">Already have an account? <Link to="/buyer/sign-in">Sign in as a buyer</Link><span aria-hidden="true"> · </span><Link to="/seller/sign-in">Sign in as a seller</Link></p>
</main>;
export default GetStarted;

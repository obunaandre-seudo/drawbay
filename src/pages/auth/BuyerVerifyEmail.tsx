import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Table, Badge, Field, Confirm, Detail, Empty, Img, Card, Skeleton, StatePage, Logo, money, slug, toast } from '../../ui';
import * as api from '../../services/api';
import { useDb, getProjects, getProjectBySlug, searchProjects, cartAdd, toggleWishlist, cartQty, cartRemove, setSession } from '../../services/api';
import type { Project, Role } from '../../types';

import { AuthForm } from '../../components/AuthForm';
export default function BuyerVerifyEmail(){ return <AuthForm role="buyer" mode="verify-email"/>; }

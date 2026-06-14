export type ItemType = 'apps' | 'earning_apps' | 'products';

export interface BaseItem {
  id: string;
  name: string;      // Fallback label, apps have name, EarningApp has name, Product has productName. Let's normalize it here.
  title: string;
  description: string;
  logo: string;
  referralLink: string;
  additionalLinks: string[];
  screenshots: string[];
  seoKeywords: string;
  averageRating: number;
  totalRatings: number;
  creatorLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppItem extends BaseItem {
  type: 'apps';
}

export interface EarningAppItem extends BaseItem {
  type: 'earning_apps';
}

export interface ProductItem {
  id: string;
  type: 'products';
  productName: string;
  productTitle: string;
  description: string;
  productImage: string;
  affiliateLink: string;
  additionalLinks: string[];
  productImages: string[];
  seoKeywords: string;
  averageRating: number;
  totalRatings: number;
  creatorLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export type StoreItem = AppItem | EarningAppItem | ProductItem;

export interface Rating {
  id: string;
  itemId: string;
  itemType: ItemType;
  rating: number;
  createdAt: string;
}

export interface Settings {
  websiteName: string;
  logoUrl?: string;
  accentColor?: string;
  searchEnabled?: boolean;
  promoterSecretCode?: string;
  pwaAppName?: string;
  pwaInstallPrompt?: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  enabled: boolean;
  title: string;
  description?: string;
  image?: string;
  link?: string;
  updatedAt: string;
}

export interface View {
  id: string;
  path: string;
  timestamp: string;
}

import { useEffect, useState, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

import { auth, db } from './lib/firebase';
import { useAppStore } from './lib/store';
import { Settings, Announcement } from './types';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import ItemDetailsPage from './pages/ItemDetailsPage';
import SearchOverlay from './components/SearchOverlay';
import AnnouncementPopup from './components/AnnouncementPopup';
import InstallBanner from './components/InstallBanner';
import PromoterDashboard from './pages/promoter/PromoterDashboard';
import CreatorProfilePage from './pages/CreatorProfilePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminItemsPage from './pages/admin/AdminItemsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminAdsPage from './pages/admin/AdminAdsPage';
import AdminAboutPage from './pages/admin/AdminAboutPage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const { setSettings, setAnnouncement, setIsAdmin, settings } = useAppStore();
  const location = useLocation();
  const trackedRef = useRef(false);

  useEffect(() => {
    // Basic page view / referrer logic
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');

    if (ref) {
      sessionStorage.setItem('promoter_ref', ref);
      
      // Track view once per session
      if (!sessionStorage.getItem('promoter_tracked_' + ref)) {
        sessionStorage.setItem('promoter_tracked_' + ref, 'true');
        // Increment link views
        const trackView = async () => {
          try {
            // Find promoter
            const q = query(collection(db, 'promoters'), where('username', '==', ref));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const promoterDoc = snap.docs[0];
              await updateDoc(promoterDoc.ref, { totalViews: increment(1) });
              
              // Find specific link entry if we exactly match generatedUrl (optional, but let's increment a 'clicks' counter)
              // This is a simplified approach: just incrementing the most recent link or we can find by originalUrl
              const lq = query(collection(db, 'promoter_links'), where('promoterId', '==', promoterDoc.id), where('originalUrl', '==', location.pathname));
              const lsnap = await getDocs(lq);
              if (!lsnap.empty) {
                await updateDoc(lsnap.docs[0].ref, { clicks: increment(1) });
              }
            }
          } catch(e) { console.error("Tracking Error", e) }
        };
        trackView();
      }
    }
  }, [location]);

  useEffect(() => {
    // Listen to settings
    const settingsUnsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings(data);
        if (data.accentColor) {
          document.documentElement.style.setProperty('--accent-color', data.accentColor);
        }
      } else {
        // defaults
        setSettings({ websiteName: 'Aasma Store', updatedAt: new Date().toISOString() });
      }
    }, (err) => console.error(err));

    // Listen to announcement
    const announcementUnsub = onSnapshot(doc(db, 'announcements', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAnnouncement({ id: docSnap.id, ...docSnap.data() } as Announcement);
      } else {
        setAnnouncement(null);
      }
      setLoading(false); // finish initial load
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // Listen to Auth state
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user && (user.email === 'jiamit134kumar@gmail.com' || user.email === 'arun2kumarkushwaha@gmail.com') && user.emailVerified) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      settingsUnsub();
      announcementUnsub();
      authUnsub();
    };
  }, [setSettings, setAnnouncement, setIsAdmin]);

  const siteTitle = settings?.websiteName || 'Aasma Store';
  const logoUrl = settings?.logoUrl || '/favicon.svg';

  useEffect(() => {
    // Dynamically update manifest for PWA
    const manifest = {
      name: siteTitle,
      short_name: siteTitle,
      description: `${siteTitle} - App Store`,
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: logoUrl,
          sizes: '192x192',
          type: 'image/png' // browser might ignore if its actually svg, but usually it works
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestURL;
  }, [siteTitle, logoUrl]);

  return (
    <>
      <Helmet>
        <title>{siteTitle}</title>
        <link rel="icon" type="image/svg+xml" href={logoUrl} />
        <link rel="apple-touch-icon" href={logoUrl} />
      </Helmet>
      
      {!loading && <AnnouncementPopup />}
      <SearchOverlay />
      <InstallBanner />

      <Routes>
        {/* Public Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/apps/:id" element={<ItemDetailsPage type="apps" />} />
          <Route path="/earning-apps/:id" element={<ItemDetailsPage type="earning_apps" />} />
          <Route path="/products/:id" element={<ItemDetailsPage type="products" />} />
          <Route path="/promoter" element={<PromoterDashboard />} />
          <Route path="/creator/:username" element={<CreatorProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="ads" element={<AdminAdsPage />} />
          <Route path="apps" element={<AdminItemsPage collectionName="apps" itemTypeLabel="Apps" />} />
          <Route path="earning-apps" element={<AdminItemsPage collectionName="earning_apps" itemTypeLabel="Earning Apps" />} />
          <Route path="products" element={<AdminItemsPage collectionName="products" itemTypeLabel="Products" />} />
          <Route path="about" element={<AdminAboutPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}

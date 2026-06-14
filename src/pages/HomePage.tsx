import React, { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useItems } from '../lib/hooks';
import ItemCard from '../components/ItemCard';
import { AppItem, EarningAppItem, ProductItem } from '../types';
import PublicAboutView from '../components/PublicAboutView';
import LoadingScreen from '../components/LoadingScreen';

export default function HomePage() {
  const location = useLocation();
  const currentTab = location.hash || '#apps';

  const { items: apps, loading: appsLoading, hasMore: appsHasMore, loadMore: appsLoadMore } = useItems<AppItem>('apps', currentTab === '#apps');
  const { items: earningApps, loading: earningLoading, hasMore: earningHasMore, loadMore: earningLoadMore } = useItems<EarningAppItem>('earning_apps', currentTab === '#earning-apps');
  const { items: products, loading: productsLoading, hasMore: productsHasMore, loadMore: productsLoadMore } = useItems<ProductItem>('products', currentTab === '#products');

  const [splashTimeout, setSplashTimeout] = React.useState(false);
  
  useEffect(() => {
    // Maximum 1.5s splash screen duration
    const timer = setTimeout(() => {
      setSplashTimeout(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  let currentItems: any[] = [];
  let loading = false;
  let type = '';
  let loadMore = () => {};
  let hasMore = false;

  if (currentTab === '#earning-apps') {
    currentItems = earningApps;
    loading = earningLoading;
    hasMore = earningHasMore;
    loadMore = earningLoadMore;
    type = 'earning_apps';
  } else if (currentTab === '#products') {
    currentItems = products;
    loading = productsLoading;
    hasMore = productsHasMore;
    loadMore = productsLoadMore;
    type = 'products';
  } else {
    currentItems = apps;
    loading = appsLoading;
    hasMore = appsHasMore;
    loadMore = appsLoadMore;
    type = 'apps';
  }

  // Pre-load the next batch in the background once the first batch is visible
  useEffect(() => {
    if (!loading && hasMore && currentItems.length === 10) {
      const timer = setTimeout(() => {
        loadMore();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, hasMore, currentItems.length, loadMore]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMore]);

  if (currentTab === '#about') {
    return (
      <div className="flex flex-col max-w-3xl mx-auto w-full md:py-8 pb-32">
        <PublicAboutView />
      </div>
    );
  }

  if (loading && currentItems.length === 0 && !splashTimeout) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full md:py-8 pb-32">
      <div className="flex flex-col w-full">
        {currentItems.map((item, index) => (
          <div ref={index === currentItems.length - 1 ? lastElementRef : null} key={item.id}>
            {/* @ts-ignore */}
            <ItemCard item={{ ...item, type } as any} />
          </div>
        ))}
        {loading && (
          <div className="text-center py-4 text-zinc-500 font-medium animate-pulse">
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}

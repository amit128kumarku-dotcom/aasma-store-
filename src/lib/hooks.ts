import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { AppItem, EarningAppItem, ProductItem } from '../types';

export function useItems<T>(collectionName: string, enabled: boolean = true) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitCount, setLimitCount] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    
    // Only show loading state if we have no items currently.
    if (items.length === 0) {
      setLoading(true);
    }
    
    const q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      let data: any[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Shuffle data first, then stable sort by creatorLevel to simulate featuring within the loaded set
      for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
      }
      data.sort((a, b) => (b.creatorLevel || 0) - (a.creatorLevel || 0));
      
      setItems(data as T[]);
      setLoading(false);
      setHasMore(data.length >= limitCount);
    }, (err) => {
      console.error(`Error fetching ${collectionName}:`, err);
      if (items.length === 0) setLoading(false);
    });

    return () => unsub();
  }, [collectionName, limitCount, enabled]); // Omit items.length as it breaks infinite loop

  const loadMore = () => {
    if (!loading && hasMore) {
      setLimitCount(prev => prev + 10);
    }
  };

  return { items, loading, hasMore, loadMore };
}

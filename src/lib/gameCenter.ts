import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, increment } from 'firebase/firestore';

export interface PublishedApp {
  id?: string;
  title: string;
  description: string;
  author: string;
  html: string;
  css: string;
  javascript: string;
  thumbnail?: string;
  category: 'game' | 'utility' | 'creative' | 'educational';
  tags: string[];
  downloads: number;
  likes: number;
  created_at: Date;
  updated_at: Date;
}

export interface AppStats {
  totalApps: number;
  totalDownloads: number;
  categories: Record<string, number>;
}

// Publish an app to the Game Center
export const publishApp = async (app: Omit<PublishedApp, 'id' | 'downloads' | 'likes' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'published_apps'), {
      ...app,
      downloads: 0,
      likes: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error publishing app:', error);
    throw error;
  }
};

// Get all published apps
export const getPublishedApps = async (category?: string, limit: number = 20): Promise<PublishedApp[]> => {
  try {
    let q = query(
      collection(db, 'published_apps'),
      orderBy('created_at', 'desc')
    );

    if (category) {
      q = query(q, where('category', '==', category));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at.toDate(),
      updated_at: doc.data().updated_at.toDate()
    })) as PublishedApp[];
  } catch (error) {
    console.error('Error getting published apps:', error);
    throw error;
  }
};

// Get popular apps (sorted by downloads + likes)
export const getPopularApps = async (limit: number = 10): Promise<PublishedApp[]> => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'published_apps'), orderBy('downloads', 'desc'))
    );
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at.toDate(),
        updated_at: doc.data().updated_at.toDate()
      }))
      .sort((a, b) => (b.downloads + b.likes) - (a.downloads + a.likes))
      .slice(0, limit) as PublishedApp[];
  } catch (error) {
    console.error('Error getting popular apps:', error);
    throw error;
  }
};

// Increment download count
export const incrementDownloads = async (appId: string): Promise<void> => {
  try {
    const appRef = doc(db, 'published_apps', appId);
    await updateDoc(appRef, {
      downloads: increment(1),
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error incrementing downloads:', error);
    throw error;
  }
};

// Increment like count
export const incrementLikes = async (appId: string): Promise<void> => {
  try {
    const appRef = doc(db, 'published_apps', appId);
    await updateDoc(appRef, {
      likes: increment(1),
      updated_at: new Date()
    });
  } catch (error) {
    console.error('Error incrementing likes:', error);
    throw error;
  }
};

// Get app statistics
export const getAppStats = async (): Promise<AppStats> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'published_apps'));
    const apps = querySnapshot.docs.map(doc => doc.data());
    
    const stats: AppStats = {
      totalApps: apps.length,
      totalDownloads: apps.reduce((sum, app) => sum + (app.downloads || 0), 0),
      categories: {}
    };

    apps.forEach(app => {
      const category = app.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting app stats:', error);
    throw error;
  }
};

// Generate downloadable code package
export const generateCodePackage = (html: string, css: string, javascript: string, title: string): Blob => {
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
${css}
    </style>
</head>
<body>
${html}
    <script>
${javascript}
    </script>
</body>
</html>`;

  return new Blob([indexHtml], { type: 'text/html' });
};
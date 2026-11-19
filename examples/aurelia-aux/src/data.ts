/**
 * In-memory sample data for Aurelia 2 .aux SFC Example
 */

export interface Comment {
  id: number;
  author: string;
  text: string;
  date: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  claps: number;
  comments: Comment[];
}

export interface DashboardStats {
  title: string;
  views: number;
  posts: number;
  engagement: number;
}

export interface ActivityItem {
  id: number;
  type: 'post' | 'like' | 'comment';
  action: string;
  timestamp: string;
}

export const initialPosts: Post[] = [
  {
    id: 1,
    title: 'Aurelia 2 Single-File Components (.aux) Architecture',
    slug: 'aurelia-aux-architecture',
    category: 'Architecture',
    excerpt: 'Deep-dive into .aux SFC compiler with script setup, scoped CSS, and zero runtime overhead.',
    content: `Aurelia 2 Single-File Components (.aux) combine HTML template, TypeScript script setup, and scoped CSS in one elegant file.`,
    author: 'Sandikodev',
    date: 'Nov 19, 2026',
    readTime: '4 min read',
    claps: 142,
    comments: [],
  },
];

export const dashboardStats: DashboardStats = {
  title: 'Engineering Telemetry',
  views: 89400,
  posts: 12,
  engagement: 98.4,
};

export const activityStream: ActivityItem[] = [
  { id: 1, type: 'post', action: 'Published Aurelia 2 .aux SFC Blueprint', timestamp: '10m ago' },
  { id: 2, type: 'like', action: 'Received clap on Architecture Deep-Dive', timestamp: '25m ago' },
];
